const https = require("https");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const TARGET_PREVIEW = process.argv.includes("--target=preview");
const FIX_AUDIO = process.argv.includes("--fix-audio"); // one-time: re-upload all videos incl. hidden ones to restore audio
const IMG_REPROCESS = process.argv.includes("--reprocess-images"); // re-fetch existing photos at Instagram-max + build the small grid thumb (resumable: skips any image whose _thumb.webp already exists on R2)
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
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
// Small grid thumbnail (~600px). The homepage/gallery grid shows 40+ tiles, so this is
// where page weight matters most; the full ~1080px image is reserved for the lightbox + hero.
async function compressImageThumb(buffer) {
  const sharp = require("sharp");
  return await sharp(buffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

async function compressVideo(inputPath, outputPath) {
  execSync(`ffmpeg -y -i "${inputPath}" -vf "scale='min(720,iw)':-2" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`, { stdio: "pipe", timeout: 120000 });
}

// ── HERO HD video encoder ── higher-resolution video for the hero, so the desktop
// site can show a crisp full-screen hero (mobile keeps the light file). Images don't
// need this — their main file is already stored at Instagram-max (~1080px).
function compressVideoHD(inputPath, outputPath) {
  execSync(`ffmpeg -y -i "${inputPath}" -vf "scale='min(1080,iw)':-2" -c:v libx264 -crf 22 -preset fast -c:a aac -b:a 160k -movflags +faststart "${outputPath}"`, { stdio: "pipe", timeout: 180000 });
}
// ── HERO MOBILE video encoder ── small ~480p copy of the hero video so phones
// load ~1MB instead of the 720p base. Hero-only; frontend falls back to the base.
function compressVideoMobile(inputPath, outputPath) {
  execSync(`ffmpeg -y -i "${inputPath}" -vf "scale='min(480,iw)':-2" -c:v libx264 -crf 30 -preset fast -c:a aac -b:a 96k -movflags +faststart "${outputPath}"`, { stdio: "pipe", timeout: 120000 });
}
// HEAD a public R2 URL to see if an object already exists (avoids rebuilding the hero HD every run).
function urlExists(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.request({ hostname: u.hostname, path: u.pathname, method: "HEAD" }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) { resolve(false); }
  });
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
    // The admin panel + frontend (RemoteState) read/write the TOP-LEVEL hero fields.
    // Read those first; fall back to the legacy admin.* nesting only if empty.
    // (Reading admin.heroVideo alone bakes the wrong default when it is "" — the bug
    //  that caused the multi-stage hero flash. Always match what the frontend reads.)
    heroVideoUrl = settings.heroVideo || settings.admin?.heroVideo || "";
    heroImageUrl = settings.heroImage || settings.admin?.heroImage || "";
    heroPosition = settings.heroPosition || settings.admin?.heroPosition || "50% 20%";
    heroZoom = settings.heroZoom || settings.admin?.heroZoom || 1;
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
        // Image-reprocess pass: re-make any photo that doesn't yet have a small grid thumb
        // (and bump its main to Instagram-max). Resumable — if the _thumb.webp already
        // exists on R2 we just record it and move on, so the job survives the CI timeout.
        let needsUpgrade = false;
        if (IMG_REPROCESS && !isVideo) {
          const thumbUrl = `${R2_IMAGES.publicUrl}/yarden_${item.id}_thumb.webp`;
          if (await urlExists(thumbUrl)) { e.thumb = thumbUrl; }
          else { needsUpgrade = true; }
        }
        if (!needsUpgrade) {
          e.post_id = item.post_id || item.id;
          e.a = cleanCaption(item.caption);
          stampMeta(e, item);
          if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
          process.stdout.write("."); continue;
        }
        // fall through to regenerate full + thumb from Instagram
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
        // Full ~1080px (lightbox + hero) AND a small ~600px grid thumbnail.
        const full = await compressImage(buffer);
        const thumb = await compressImageThumb(buffer);
        const rFull = await uploadToR2(R2_IMAGES, full, `yarden_${item.id}.webp`, "image/webp");
        let thumbUrl = "";
        const rThumb = await uploadToR2(R2_IMAGES, thumb, `yarden_${item.id}_thumb.webp`, "image/webp");
        if (rThumb.status === 200) thumbUrl = `${R2_IMAGES.publicUrl}/yarden_${item.id}_thumb.webp`;
        if (rFull.status === 200) {
          const entry = stampMeta({ u: `${R2_IMAGES.publicUrl}/yarden_${item.id}.webp`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id, thumb: thumbUrl }, item);
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Image OK: yarden_${item.id}.webp${thumbUrl ? ' +thumb' : ''}`);
        } else {
          console.error(`Image R2 failed (${rFull.status}): ${rFull.body.substring(0, 300)}`);
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
    ? ["preview/index.html", "preview/gallery.html"]
    : ["index.html", "gallery.html"];
  // Determine current hero for baking into index.html (prevents flash of wrong video on first load)
  const hvm = (heroVideoUrl||'').match(/yarden_(\d+)\.mp4/);
  const him = (heroImageUrl||'').match(/yarden_(\d+)\.webp/);
  const bakedHeroId   = hvm ? hvm[1] : (him ? him[1] : '18100404782127411');
  const bakedHeroIsVid = !!hvm || !him;
  const bakedHeroSrc  = bakedHeroIsVid
    ? `${R2_VIDEOS.publicUrl}/yarden_${bakedHeroId}.mp4`
    : `${R2_IMAGES.publicUrl}/yarden_${bakedHeroId}.webp`;
  const bakedHeroPoster = `${R2_IMAGES.publicUrl}/yarden_${bakedHeroId}_thumb.jpg`;

  const ver = Date.now();
  for (const htmlFile of htmlFiles) {
    try {
      let html = fs.readFileSync(htmlFile, "utf8");
      if (/gallery-data\.js\?v=\d+/.test(html)) html = html.replace(/gallery-data\.js\?v=\d+/g, `gallery-data.js?v=${ver}`);
      else html = html.replace(/gallery-data\.js(?!\?)/g, `gallery-data.js?v=${ver}`);
      // Bake the current hero (video OR image) into index.html so the first paint is ALWAYS
      // the admin-chosen hero — never an old default that the frontend then swaps out (the
      // multi-stage old-thumb → new-thumb → video flash). Set both the <video> and the <img>
      // initial state so whichever type is chosen is visible from the very first frame.
      if (htmlFile.endsWith('index.html')) {
        // Always keep the <video><source> and its single poster pointed at the chosen video
        // (for an image hero this stays whatever was there — the hidden <video> never loads).
        if (bakedHeroIsVid) {
          html = html.replace(/(<source id="heroVideoSource" src=")[^"]*(")/, `$1${bakedHeroSrc}$2`);
        }
        // Rewrite the <video id="heroVideo" ...> opening tag: strip EVERY existing poster=""
        // (there must never be more than one — a duplicate poster was the cause of the old/new
        // thumbnail double-flash) and set exactly one correct poster.
        html = html.replace(/<video id="heroVideo"[^>]*>/, (tag) => {
          let t = tag.replace(/\s*poster="[^"]*"/g, '');
          t = t.replace(/^<video id="heroVideo"/, `<video id="heroVideo" poster="${bakedHeroPoster}"`);
          // Toggle the video's visibility via its inline style (hidden for an image hero).
          t = t.replace(/(style="[^"]*?);?\s*display:\s*(?:none|block);?/, '$1;');
          if (!bakedHeroIsVid) t = t.replace(/(style="[^"]*?)(")/, '$1display:none;$2');
          return t;
        });
        // Bake the <img id="heroImage"> too: an image hero shows it (src + display:block);
        // a video hero keeps it empty + hidden so it never paints.
        html = html.replace(/(<img id="heroImage" src=")[^"]*(")/, `$1${bakedHeroIsVid ? '' : bakedHeroSrc}$2`);
        html = html.replace(/(<img id="heroImage"[^>]*style="[^"]*?)display:\s*(?:none|block);([^"]*")/,
          `$1display:${bakedHeroIsVid ? 'none' : 'block'};$2`);
        console.log(`Baked hero ${bakedHeroIsVid ? 'video' : 'image'} (yarden_${bakedHeroId}) into ${htmlFile}`);
      }
      fs.writeFileSync(htmlFile, html, "utf8");
      console.log(`Bumped gallery-data.js cache version in ${htmlFile} to ${ver}`);
    } catch(e) { console.warn(`Could not bump ${htmlFile}:`, e.message); }
  }

  // ── HERO HD ── ensure the current hero (admin-chosen, or the baked default) has a
  // ~1080p copy on R2 so the desktop site can serve a crisp full-screen hero. Hero-only,
  // to keep storage minimal; the frontend falls back to the light file if _hd is absent.
  // Keep DEFAULT_HERO_ID in sync with the baked <source> in preview/index.html.
  const DEFAULT_HERO_ID = "18100404782127411", DEFAULT_HERO_IS_VIDEO = true;
  try {
    let heroId = "", heroIsVideo = true;
    const vm = (heroVideoUrl || "").match(/yarden_(\d+)\.mp4/);
    const im = (heroImageUrl || "").match(/yarden_(\d+)\.webp/);
    if (vm) { heroId = vm[1]; heroIsVideo = true; }
    else if (im) { heroId = im[1]; heroIsVideo = false; }
    else { heroId = DEFAULT_HERO_ID; heroIsVideo = DEFAULT_HERO_IS_VIDEO; }

    const hdName = heroIsVideo ? `yarden_${heroId}_hd.mp4` : `yarden_${heroId}_hd.webp`;
    const hdCfg = heroIsVideo ? R2_VIDEOS : R2_IMAGES;
    const hdPublic = `${hdCfg.publicUrl}/${hdName}`;

    if (await urlExists(hdPublic)) {
      console.log(`Hero HD already present: ${hdName}`);
    } else {
      const src = rawPosts.find(p => String(p.id) === String(heroId));
      if (!src || !src.media_url) {
        console.warn(`Hero HD: item ${heroId} not in this fetch (or no media_url) — desktop falls back to the light file until a sync includes it.`);
      } else if (heroIsVideo) {
        if (!hasFfmpeg) { console.warn("Hero HD: ffmpeg unavailable — skipped."); }
        else {
          console.log(`Hero HD: building 1080p video for ${heroId}...`);
          const tmpIn = `/tmp/hdin_${heroId}.mp4`, tmpOut = `/tmp/hdout_${heroId}.mp4`;
          const { buffer } = await downloadBuffer(src.media_url, 60000);
          fs.writeFileSync(tmpIn, buffer);
          try { compressVideoHD(tmpIn, tmpOut); } catch (fe) { fs.copyFileSync(tmpIn, tmpOut); }
          const hd = fs.readFileSync(tmpOut);
          try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (e) {}
          const r = await uploadToR2(R2_VIDEOS, hd, hdName, "video/mp4");
          console.log(r.status === 200 ? `Hero HD OK: ${hdName} (${(hd.length / 1e6).toFixed(1)}MB)` : `Hero HD upload failed (${r.status})`);
        }
      } else {
        // Image heroes are already served at Instagram-max via the main yarden_<id>.webp
        // (now ~1080px), so no separate _hd image is needed.
        console.log(`Hero ${heroId} is an image — served at Instagram-max via the main file; no _hd needed.`);
      }
    }
  } catch (e) { console.error("Hero HD step error:", e.message); }

  // ── HERO MOBILE ── small ~480p copy of the current hero video so phones load
  // ~1MB instead of the 720p base. Hero-only; frontend falls back to base if absent.
  try {
    let heroId = "", heroIsVideo = true;
    const vm = (heroVideoUrl || "").match(/yarden_(\d+)\.mp4/);
    if (vm) { heroId = vm[1]; heroIsVideo = true; }
    else if ((heroImageUrl || "").match(/yarden_(\d+)\.webp/)) { heroIsVideo = false; }
    else { heroId = DEFAULT_HERO_ID; heroIsVideo = DEFAULT_HERO_IS_VIDEO; }
    if (heroIsVideo && heroId) {
      const mName = `yarden_${heroId}_mobile.mp4`;
      const mPublic = `${R2_VIDEOS.publicUrl}/${mName}`;
      if (await urlExists(mPublic)) {
        console.log(`Hero mobile already present: ${mName}`);
      } else if (!hasFfmpeg) {
        console.warn("Hero mobile: ffmpeg unavailable — skipped.");
      } else {
        const src = rawPosts.find(p => String(p.id) === String(heroId));
        if (!src || !src.media_url) {
          console.warn(`Hero mobile: item ${heroId} not in this fetch — phones fall back to the base until a sync includes it.`);
        } else {
          console.log(`Hero mobile: building 480p video for ${heroId}...`);
          const tmpIn = `/tmp/mbin_${heroId}.mp4`, tmpOut = `/tmp/mbout_${heroId}.mp4`;
          const { buffer } = await downloadBuffer(src.media_url, 60000);
          fs.writeFileSync(tmpIn, buffer);
          try { compressVideoMobile(tmpIn, tmpOut); } catch (fe) { fs.copyFileSync(tmpIn, tmpOut); }
          const mb = fs.readFileSync(tmpOut);
          try { fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut); } catch (e) {}
          const r = await uploadToR2(R2_VIDEOS, mb, mName, "video/mp4");
          console.log(r.status === 200 ? `Hero mobile OK: ${mName} (${(mb.length/1e6).toFixed(2)}MB)` : `Hero mobile upload failed (${r.status})`);
        }
      }
    }
  } catch (e) { console.error("Hero mobile step error:", e.message); }

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
