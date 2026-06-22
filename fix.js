const https = require("https");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const TARGET_PREVIEW = process.argv.includes("--target=preview");
const FIX_AUDIO = process.argv.includes("--fix-audio"); // one-time: re-upload all videos incl. hidden ones to restore audio
const GALLERY_FILE = TARGET_PREVIEW ? "preview/gallery-data.js" : "gallery-data.js";
console.log("Target:", GALLERY_FILE);

const R2_IMAGES = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucket: "yarden-images",
  publicUrl: "https://images.yardendamri.co.il"
};

const R2_VIDEOS = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucket: "yarden-videos-new",
  publicUrl: "https://videos-new.yardendamri.co.il"
};

function get(url, timeoutMs=10000) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location, timeoutMs).then(resolve);
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
      }).on("error", () => resolve({}));
      req.setTimeout(timeoutMs, () => { req.destroy(); resolve({}); });
    } catch(e) { resolve({}); }
  });
}

// Retry wrapper: get() resolves to {} on any timeout/error/parse-fail.
// Retrying prevents a single flaky request from silently truncating pagination
// (which dropped large numbers of posts, not just reels).
async function getJSON(url, timeoutMs=15000, retries=3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await get(url, timeoutMs);
    if (res && Object.keys(res).length) return res;
    if (attempt < retries) await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
  }
  return {};
}

function downloadBuffer(url, timeoutMs=30000) {
  return new Promise((resolve, reject) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return downloadBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "application/octet-stream" }));
      }).on("error", reject);
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("download timeout")); });
    } catch(e) { reject(e); }
  });
}

async function compressImage(buffer) {
  const sharp = require("sharp");
  return await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function compressVideo(inputPath, outputPath) {
  execSync(`ffmpeg -y -i "${inputPath}" -vf "scale='min(720,iw)':-2" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`, { stdio: "pipe", timeout: 120000 });
}

async function uploadToR2(cfg, buffer, fileName, contentType) {
  const endpoint = new URL(cfg.endpoint);
  const host = endpoint.hostname;
  const path = `/${cfg.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const region = "auto", service = "s3";
  const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + cfg.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host, path, method: "PUT",
      headers: { "Content-Type": contentType, "Content-Length": buffer.length, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "Authorization": authorization }
    }, (res) => { let d = ""; res.on("data", (c) => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d })); });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("upload timeout")); });
    req.write(buffer); req.end();
  });
}

function safeWrite(filePath, data) {
  const safe = Buffer.from(data, 'utf8').toString('utf8').replace(/[\uD800-\uDFFF]/g, '');
  fs.writeFileSync(filePath, safe, 'utf8');
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("ERROR: No INSTAGRAM_TOKEN"); return; }
  if (!R2_IMAGES.accessKeyId) { console.error("ERROR: Missing R2 credentials"); return; }

  try { require("sharp"); } catch(e) { execSync("npm install sharp", { stdio: "inherit" }); }

  let hasFfmpeg = false;
  try { execSync("which ffmpeg", {stdio:"pipe"}); hasFfmpeg = true; } catch(e) {}
  console.log("ffmpeg:", hasFfmpeg);

  let mediaBaseId = "me", baseHost = "graph.instagram.com";
  const testResp = await get(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
  if (testResp.error) {
    const fbResp = await get(`https://graph.facebook.com/me?fields=id,name&access_token=${token}`);
    if (fbResp.error) { console.error("TOKEN ERROR:", JSON.stringify(fbResp.error)); return; }
    const pages = await get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
    for (const page of (pages.data || [])) {
      const p = await get(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${token}`);
      if (p.instagram_business_account) { mediaBaseId = p.instagram_business_account.id; baseHost = "graph.facebook.com"; break; }
    }
    if (mediaBaseId === "me") { console.error("No Instagram Business Account found"); return; }
  }

  // How many posts does the account actually have? Used to detect under-fetching (the API
  // — especially for Reels — sometimes returns fewer items than really exist).
  let mediaCount = null;
  try {
    const acct = await getJSON(`https://${baseHost}/${mediaBaseId}?fields=media_count&access_token=${token}`, 15000, 3);
    if (typeof acct.media_count === "number") mediaCount = acct.media_count;
  } catch(e) {}
  console.log("Account media_count (top-level posts reported by Instagram):", mediaCount === null ? "unknown" : mediaCount);

  console.log("Fetching media...");
  let rawPosts = [];
  let url = `https://${baseHost}/${mediaBaseId}/media?fields=id,media_type,media_product_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count&limit=100&access_token=${token}`;
  let pageCount = 0, fetchFailed = false, topLevelCount = 0;
  const typeBreakdown = {}, noUrlSkipped = [];
  while (url) {
    const res = await getJSON(url, 15000, 4);
    if (!res.data) {
      // Genuine failure after retries — log loudly, do NOT silently drop the rest
      console.error(`\n⚠️ Page ${pageCount + 1} failed after retries — pagination stopped early, posts may be missing.`);
      fetchFailed = true;
      break;
    }
    pageCount++;
    for (const item of res.data) {
      topLevelCount++;
      const k = `${item.media_type}${item.media_product_type ? "/" + item.media_product_type : ""}`;
      typeBreakdown[k] = (typeBreakdown[k] || 0) + 1;
      if (item.media_type === "CAROUSEL_ALBUM") {
        const ch = await getJSON(`https://${baseHost}/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`, 15000, 4);
        const kids = ch.data || [];
        if (!kids.length) console.warn(`\n⚠️ Carousel ${item.id} returned no children — skipped.`);
        kids.forEach((c, ci) => rawPosts.push({ ...c, caption: item.caption, like_count: item.like_count, comments_count: item.comments_count, post_id: item.id, carousel: true, cidx: ci, ccount: kids.length }));
      } else {
        if (!item.media_url) noUrlSkipped.push(`${item.id}(${k})`);
        rawPosts.push({ ...item, post_id: item.id });
      }
    }
    // If a page comes back empty but Instagram still hands us a "next" cursor, that is the API
    // hiccupping mid-pagination — keep going, but flag it so we never treat it as a clean run.
    if (res.data.length === 0 && res.paging?.next) { console.warn(`\n⚠️ Page ${pageCount} returned 0 items but has a next cursor — API hiccup.`); fetchFailed = true; }
    url = res.paging?.next || null;
  }
  console.log(`Fetched ${topLevelCount} top-level posts (${rawPosts.length} items incl. carousel children) across ${pageCount} pages${fetchFailed ? " (INCOMPLETE)" : ""}`);
  console.log("Type breakdown:", JSON.stringify(typeBreakdown));
  if (mediaCount !== null && topLevelCount < mediaCount) {
    console.warn(`\n⚠️ GAP: Instagram reports ${mediaCount} posts but the API only returned ${topLevelCount}. ${mediaCount - topLevelCount} post(s) are NOT being delivered by the /media edge (commonly collab/co-author posts or Reels the API withholds).`);
  }
  if (noUrlSkipped.length) console.warn(`\n⚠️ ${noUrlSkipped.length} item(s) had NO media_url (cannot download): ${noUrlSkipped.slice(0, 20).join(", ")}`);

  let existing = [];
  try {
    const raw = fs.readFileSync(GALLERY_FILE, "utf8").replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existing = JSON.parse(raw);
  } catch(e) {}
  const existingById = {};
  existing.forEach(e => { if (e.item_id) existingById[e.item_id] = e; });

  let hiddenUrls = new Set(), hiddenIds = new Set();
  let heroVideoUrl = "", heroImageUrl = "", heroPosition = "50% 20%", heroZoom = 1;
  try {
    const settings = JSON.parse(fs.readFileSync("gallery-settings.json", "utf8"));
    (settings.admin?.hidden || settings.hidden || []).forEach(u => {
      hiddenUrls.add(u);
      const m = u.match(/yarden_(?:makeup_)?(\d+)\./);
      if (m) hiddenIds.add(m[1]);
    });
    console.log(`Hidden: ${hiddenUrls.size}`);
    heroVideoUrl = settings.admin?.heroVideo || "";
    heroImageUrl = settings.admin?.heroImage || "";
    heroPosition = settings.admin?.heroPosition || "50% 20%";
    heroZoom = settings.admin?.heroZoom || 1;
  } catch(e) {}

  const gallery = [], seenUrls = new Set();
  const cleanCaption = (s) => (s || "").replace(/[\uD800-\uDFFF\u200B-\u200F\u202A-\u202E]/g, "").substring(0, 80).trim();
  // Tag carousel children so the gallery can show a "multiple media" badge / group them.
  const stampMeta = (entry, item) => {
    if (item.carousel) { entry.carousel = true; entry.post_id = item.post_id || item.id; entry.cidx = item.cidx; entry.ccount = item.ccount; }
    return entry;
  };

  for (const item of rawPosts) {
    const isVideo = item.media_type === "VIDEO";

    const isHidden = hiddenIds.has(item.id) || (existingById[item.id] && hiddenUrls.has(existingById[item.id].u));
    if (isHidden) {
      // Keep hidden media IN gallery-data.js (so it stays listed for admin and remains on R2),
      // flagged hidden:true. Public pages filter it out via gallery-settings.json. No re-upload —
      // these were uploaded before, so we reuse the existing entry or the deterministic R2 URL.
      let entry = existingById[item.id];
      if (entry) {
        entry.post_id = item.post_id || item.id;
        entry.a = cleanCaption(item.caption);
      } else if (isVideo) {
        entry = { u: `${R2_VIDEOS.publicUrl}/yarden_${item.id}.mp4`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id, video: true, thumb: `${R2_IMAGES.publicUrl}/yarden_${item.id}_thumb.jpg` };
      } else {
        entry = { u: `${R2_IMAGES.publicUrl}/yarden_${item.id}.webp`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id };
      }
      entry.hidden = true;
      stampMeta(entry, item);
      if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
      process.stdout.write("h"); continue;
    }

    if (!FIX_AUDIO && existingById[item.id]) {
      const e = existingById[item.id];
      const isNewR2 = (isVideo && e.u && e.u.includes("videos-new.yardendamri")) ||
                      (!isVideo && e.u && e.u.includes("images.yardendamri"));
      if (isNewR2) {
        e.post_id = item.post_id || item.id;
        e.a = cleanCaption(item.caption);
        stampMeta(e, item);
        if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
        process.stdout.write("."); continue;
      }
    }

    if (isVideo) {
      if (!hasFfmpeg) { process.stdout.write("S"); continue; }
      console.log(`\nUploading video ${item.id}...`);
      try {
        const tmpIn = `/tmp/vin_${item.id}.mp4`;
        const tmpOut = `/tmp/vout_${item.id}.mp4`;
        const { buffer } = await downloadBuffer(item.media_url);
        fs.writeFileSync(tmpIn, buffer);
        try { await compressVideo(tmpIn, tmpOut); } catch(fe) { fs.copyFileSync(tmpIn, tmpOut); }
        const compressed = fs.readFileSync(tmpOut);
        // Extract thumbnail before deleting tmpOut
        let thumbUrl = "";
        try {
          const thumbOut = `/tmp/thumb_${item.id}.jpg`;
          execSync(`ffmpeg -y -i "${tmpOut}" -vf "select=eq(n\\,0)" -vframes 1 "${thumbOut}"`, { stdio: "pipe", timeout: 30000 });
          const thumbBuf = fs.readFileSync(thumbOut);
          fs.unlinkSync(thumbOut);
          const tr = await uploadToR2(R2_IMAGES, thumbBuf, `yarden_${item.id}_thumb.jpg`, "image/jpeg");
          if (tr.status === 200) thumbUrl = `${R2_IMAGES.publicUrl}/yarden_${item.id}_thumb.jpg`;
        } catch(te) { console.log(`Thumb failed: ${te.message}`); }
        try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch(e) {}
        const r2Result = await uploadToR2(R2_VIDEOS, compressed, `yarden_${item.id}.mp4`, "video/mp4");
        if (r2Result.status === 200) {
          const entry = stampMeta({ u: `${R2_VIDEOS.publicUrl}/yarden_${item.id}.mp4`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id, video: true, thumb: thumbUrl }, item);
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Video OK: yarden_${item.id}.mp4${thumbUrl ? ' +thumb' : ''}`);
        } else {
          console.error(`Video R2 failed (${r2Result.status}): ${r2Result.body.substring(0, 300)}`);
        }
      } catch(e) { console.error(`Video error ${item.id}:`, e.message); }
    } else {
      console.log(`\nUploading image ${item.id}...`);
      try {
        const { buffer } = await downloadBuffer(item.media_url);
        const compressed = await compressImage(buffer);
        const r2Result = await uploadToR2(R2_IMAGES, compressed, `yarden_${item.id}.webp`, "image/webp");
        if (r2Result.status === 200) {
          const entry = stampMeta({ u: `${R2_IMAGES.publicUrl}/yarden_${item.id}.webp`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id }, item);
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Image OK: yarden_${item.id}.webp`);
        } else {
          console.error(`Image R2 failed (${r2Result.status}): ${r2Result.body.substring(0, 300)}`);
        }
      } catch(e) { console.error(`Image error ${item.id}:`, e.message); }
    }
  }

  // NON-DESTRUCTIVE UNION: anything we synced before (already on R2) that this run's fetch did
  // NOT return is carried forward instead of being dropped. Instagram's /media edge omits items
  // intermittently (and permanently for some — collab posts, certain Reels); without this, every
  // flaky run silently prunes live media from the site. Carried items keep their old order (appended).
  const seenIds = new Set(gallery.map(e => e.item_id));
  let carried = 0;
  for (const e of existing) {
    if (!e || !e.u) continue;
    if (seenIds.has(e.item_id) || seenUrls.has(e.u)) continue;
    // Respect current hidden settings for carried-forward items too
    const idMatch = (e.u.match(/yarden_(?:makeup_)?(\d+)\./) || [])[1];
    if ((idMatch && hiddenIds.has(idMatch)) || hiddenUrls.has(e.u)) e.hidden = true;
    seenUrls.add(e.u); seenIds.add(e.item_id);
    gallery.push(e);
    carried++;
  }
  if (carried) console.log(`Carried forward ${carried} previously-synced item(s) the API did not return this run.`);

  console.log(`\nSaving ${gallery.length} items to ${GALLERY_FILE}`);
  safeWrite(GALLERY_FILE, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);

  // Bump gallery-data.js version in every page that loads it, so browsers don't serve stale cache
  const htmlFiles = TARGET_PREVIEW
    ? ["preview/index.html", "preview/gallery.html", "preview/index-temp.html", "preview/gallery-temp.html"]
    : ["index.html", "gallery.html"];
  const ver = Date.now();
  for (const htmlFile of htmlFiles) {
    try {
      let html = fs.readFileSync(htmlFile, "utf8");
      if (/gallery-data\.js\?v=\d+/.test(html)) html = html.replace(/gallery-data\.js\?v=\d+/g, `gallery-data.js?v=${ver}`);
      else html = html.replace(/gallery-data\.js(?!\?)/g, `gallery-data.js?v=${ver}`);
      fs.writeFileSync(htmlFile, html, "utf8");
      console.log(`Bumped gallery-data.js cache version in ${htmlFile} to ${ver}`);
    } catch(e) { console.warn(`Could not bump ${htmlFile}:`, e.message); }
  }

  console.log("Fetching stats...");
  const uniquePostIds = [...new Set(rawPosts.map(p => p.post_id || p.id).filter(Boolean))];
  // Collect ALL IDs: from rawPosts AND from existing gallery items (covers old carousel children)
  let existingGallery = [];
  try {
    const gr = fs.readFileSync(GALLERY_FILE, "utf8").replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existingGallery = JSON.parse(gr);
  } catch(e) {}
  const galleryItemIds = existingGallery.map(g => String(g.item_id || '')).filter(Boolean);
  const allIds = [...new Set([...uniquePostIds, ...galleryItemIds])];
  let stats = {};
  try { stats = JSON.parse(fs.readFileSync("instagram-stats.json", "utf8")); } catch(e) {}
  const newIds = allIds.filter(id => !stats[id]);
  console.log(`Stats: ${Object.keys(stats).length} cached, ${newIds.length} new to fetch`);
  const BATCH = 20;
  for (let i = 0; i < newIds.length; i += BATCH) {
    await Promise.all(newIds.slice(i, i + BATCH).map(async id => {
      try {
        const data = await get(`https://${baseHost}/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`, 10000);
        stats[id] = { likes: data.like_count || 0, comments_count: data.comments_count || 0, comments: (data.comments?.data || []).map(c => ({ username: c.username || "", text: c.text || "", timestamp: c.timestamp || "" })) };
      } catch(e) { stats[id] = { likes: 0, comments_count: 0, comments: [] }; }
    }));
  }
  safeWrite("instagram-stats.json", JSON.stringify(stats, null, 2));
  // Update post_id for items that now have stats via their item_id
  let galleryUpdated = false;
  try {
    let galleryRaw = fs.readFileSync(GALLERY_FILE, "utf8").replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    let galleryData = JSON.parse(galleryRaw);
    const statsKeys = new Set(Object.keys(stats));
    for (const item of galleryData) {
      if (!item.post_id && item.item_id && statsKeys.has(String(item.item_id))) {
        item.post_id = String(item.item_id);
        galleryUpdated = true;
      }
    }
    if (galleryUpdated) {
      safeWrite(GALLERY_FILE, "// Auto-generated gallery data\nconst GALLERY_IMAGES = " + JSON.stringify(galleryData, null, 2) + ";");
      console.log("Updated gallery-data.js with matched post_ids");
    }
  } catch(e) { console.error("gallery post_id update error:", e.message); }
  console.log(`Done. ${Object.keys(stats).length} total posts.`);
})();
