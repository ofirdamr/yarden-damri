const https = require("https");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const TARGET_PREVIEW = process.argv.includes("--target=preview");
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

function get(url, timeoutMs=8000) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location, timeoutMs).then(resolve);
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    }).on("error", () => resolve({}));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({}); });
  });
}

function downloadBuffer(url, timeoutMs=30000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return downloadBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "application/octet-stream" }));
    }).on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("download timeout")); });
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
  execSync(`ffmpeg -y -i "${inputPath}" -vf "scale='min(720,iw)':-2" -c:v libx264 -crf 28 -preset fast -an -movflags +faststart "${outputPath}"`, { stdio: "pipe" });
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
    req.on("error", reject); req.write(buffer); req.end();
  });
}

async function checkExistsR2(cfg, fileName) {
  const endpoint = new URL(cfg.endpoint);
  const host = endpoint.hostname;
  const path = `/${cfg.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const region = "auto", service = "s3";
  const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `HEAD\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + cfg.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve) => {
    const req = https.request({
      hostname: host, path, method: "HEAD",
      headers: { "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "Authorization": authorization }
    }, (res) => resolve(res.statusCode === 200));
    req.on("error", () => resolve(false)); req.end();
  });
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("ERROR: No INSTAGRAM_TOKEN"); return; }
  if (!R2_IMAGES.accessKeyId) { console.error("ERROR: Missing R2 credentials"); return; }

  // Install sharp
  try { require("sharp"); } catch(e) { execSync("npm install sharp", { stdio: "inherit" }); }

  let mediaBaseId = "me", baseHost = "graph.instagram.com";
  const testResp = await get(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
  if (testResp.error) {
    const fbResp = await get(`https://graph.facebook.com/me?fields=id,name&access_token=${token}`);
    if (fbResp.error) { console.error("TOKEN ERROR:", JSON.stringify(fbResp.error)); return; }
    const pages = await get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
    for (const page of pages.data || []) {
      const p = await get(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${token}`);
      if (p.instagram_business_account) { mediaBaseId = p.instagram_business_account.id; baseHost = "graph.facebook.com"; break; }
    }
    if (mediaBaseId === "me") { console.error("No Instagram Business Account found"); return; }
  }

  console.log("Fetching media...");
  let rawPosts = [];
  let url = `https://${baseHost}/${mediaBaseId}/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count&limit=100&access_token=${token}`;
  while (url) {
    const res = await get(url);
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const ch = await get(`https://${baseHost}/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`);
        for (const c of ch.data || []) rawPosts.push({ ...c, caption: item.caption, like_count: item.like_count, comments_count: item.comments_count, post_id: item.id });
      } else {
        rawPosts.push({ ...item, post_id: item.id });
      }
    }
    url = res.paging?.next || null;
  }
  console.log(`Fetched ${rawPosts.length} items`);

  let existing = [];
  try {
    const raw = fs.readFileSync(GALLERY_FILE, "utf8")
      .replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existing = JSON.parse(raw);
  } catch(e) {}
  const existingById = {};
  existing.forEach(e => { if (e.item_id) existingById[e.item_id] = e; });

  let hiddenUrls = new Set();
  let hiddenIds = new Set();
  try {
    const settings = JSON.parse(fs.readFileSync("gallery-settings.json", "utf8"));
    (settings.admin?.hidden || settings.hidden || []).forEach(u => {
      hiddenUrls.add(u);
      const m = u.match(/yarden_(?:makeup_)?(\d+)\./);
      if (m) hiddenIds.add(m[1]);
    });
    console.log(`Hidden items: ${hiddenUrls.size}`);
  } catch(e) {}

  const gallery = [], seenUrls = new Set();
  const cleanCaption = (s) => (s || "").replace(/[⁨⁩‪-‮​-‏⁠-⁤﻿`]/g, "").substring(0, 80).trim();

  for (const item of rawPosts) {
    const isVideo = item.media_type === "VIDEO";

    if (hiddenIds.has(item.id) || (existingById[item.id] && hiddenUrls.has(existingById[item.id].u))) {
      process.stdout.write("H"); continue;
    }

    // Check if already uploaded to new R2 buckets
    if (existingById[item.id]) {
      const e = existingById[item.id];
      const isNewR2 = (isVideo && e.u && e.u.includes("videos-new.yardendamri")) ||
                      (!isVideo && e.u && e.u.includes("images.yardendamri"));
      if (isNewR2) {
        // Always update post_id and caption in case they changed
        e.post_id = item.post_id || item.id;
        e.a = cleanCaption(item.caption);
        if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
        process.stdout.write("."); continue;
      }
    }

    if (isVideo) {
      const fileName = `yarden_${item.id}.mp4`;
      const existsInR2 = await checkExistsR2(R2_VIDEOS, fileName);
      if (existsInR2) {
        const entry = { u: `${R2_VIDEOS.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id, video: true, thumb: "" };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
        process.stdout.write("~"); continue;
      }
      console.log(`\nUploading video ${item.id}...`);
      try {
        const tmpIn = `/tmp/vin_${item.id}.mp4`;
        const tmpOut = `/tmp/vout_${item.id}.mp4`;
        const { buffer } = await downloadBuffer(item.media_url);
        let compressed = buffer;
        try {
          fs.writeFileSync(tmpIn, buffer);
          await compressVideo(tmpIn, tmpOut);
          compressed = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpIn); fs.unlinkSync(tmpOut);
        } catch(fe) { console.log(`ffmpeg unavailable, uploading original`); try{fs.unlinkSync(tmpIn);}catch(e){} }
        const r2Result = await uploadToR2(R2_VIDEOS, compressed, fileName, "video/mp4");
        if (r2Result.status === 200) {
          const entry = { u: `${R2_VIDEOS.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id, video: true, thumb: "" };
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Video OK: ${fileName}`);
        } else { console.error(`R2 video failed ${item.id}: ${r2Result.status} ${r2Result.body}`); }
      } catch(e) { console.error(`Video error ${item.id}:`, e.message); }
    } else {
      const fileName = `yarden_${item.id}.webp`;
      const existsInR2 = await checkExistsR2(R2_IMAGES, fileName);
      if (existsInR2) {
        const entry = { u: `${R2_IMAGES.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
        process.stdout.write("~"); continue;
      }
      console.log(`\nUploading image ${item.id}...`);
      try {
        const { buffer } = await downloadBuffer(item.media_url);
        const compressed = await compressImage(buffer);
        const r2Result = await uploadToR2(R2_IMAGES, compressed, fileName, "image/webp");
        if (r2Result.status === 200) {
          const entry = { u: `${R2_IMAGES.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, post_id: item.post_id || item.id };
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Image OK: ${fileName}`);
        } else { console.error(`R2 image failed ${item.id}: ${r2Result.status} ${r2Result.body}`); }
      } catch(e) { console.error(`Image error ${item.id}:`, e.message); }
    }
  }

  console.log(`\nSaving ${gallery.length} items to ${GALLERY_FILE}`);
  fs.writeFileSync(GALLERY_FILE, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);

  console.log("Fetching stats...");
  const uniquePostIds = [...new Set(rawPosts.map(p => p.post_id || p.id).filter(Boolean))];
  let stats = {};
  try { stats = JSON.parse(fs.readFileSync("instagram-stats.json", "utf8")); } catch(e) {}
  const newIds = uniquePostIds.filter(id => !stats[id]);
  console.log(`Stats: ${Object.keys(stats).length} cached, ${newIds.length} new to fetch`);
  const BATCH = 20;
  for (let i = 0; i < newIds.length; i += BATCH) {
    const batch = newIds.slice(i, i + BATCH);
    await Promise.all(batch.map(async id => {
      try {
        const data = await get(`https://${baseHost}/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`);
        stats[id] = { likes: data.like_count || 0, comments_count: data.comments_count || 0, comments: (data.comments?.data || []).map(c => ({ username: c.username || "", text: c.text || "", timestamp: c.timestamp || "" })) };
      } catch(e) { stats[id] = { likes: 0, comments_count: 0, comments: [] }; }
    }));
  }
  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`Done. ${Object.keys(stats).length} total posts.`);
})();
