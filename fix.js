const https = require("https");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const IK_IMAGES = {
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: "https://ik.imagekit.io/Yardendamri"
};

// R2 config for videos
const R2 = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT, // e.g. https://ACCOUNT_ID.r2.cloudflarestorage.com
  bucket: "yarden-videos",
  publicUrl: "https://ik.imagekit.io/yardenvideos"
};

function get(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve);
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    }).on("error", () => resolve({}));
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] || "video/mp4" }));
    }).on("error", reject);
  });
}

function uploadToImageKit(mediaUrl, fileName) {
  const auth = Buffer.from(IK_IMAGES.privateKey + ":").toString("base64");
  const body = JSON.stringify({ file: mediaUrl, fileName, folder: "/instagram", useUniqueFileName: false });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "upload.imagekit.io", path: "/api/v1/files/upload", method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}`, "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let d = ""; res.on("data", (c) => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function checkExistsImageKit(fileName) {
  const auth = Buffer.from(IK_IMAGES.privateKey + ":").toString("base64");
  return new Promise((resolve) => {
    https.get({
      hostname: "api.imagekit.io",
      path: `/api/v1/files?searchQuery=name%3D"${encodeURIComponent(fileName)}"&limit=1`,
      headers: { "Authorization": `Basic ${auth}` }
    }, (res) => {
      let d = ""; res.on("data", (c) => d += c);
      res.on("end", () => { try { const a = JSON.parse(d); resolve(Array.isArray(a) && a.length ? a[0] : null); } catch(e) { resolve(null); } });
    }).on("error", () => resolve(null));
  });
}

// R2 upload using AWS Signature V4
async function uploadToR2(buffer, fileName, contentType) {
  const endpoint = new URL(R2.endpoint);
  const host = endpoint.hostname;
  const path = `/${R2.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const region = "auto";
  const service = "s3";

  const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + R2.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${R2.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host, path, method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorization
      }
    }, (res) => {
      let d = ""; res.on("data", (c) => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

async function checkExistsR2(fileName) {
  const endpoint = new URL(R2.endpoint);
  const host = endpoint.hostname;
  const path = `/${R2.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const region = "auto";
  const service = "s3";
  const payloadHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `HEAD\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + R2.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve) => {
    const req = https.request({
      hostname: host, path, method: "HEAD",
      headers: { "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "Authorization": authorization }
    }, (res) => resolve(res.statusCode === 200));
    req.on("error", () => resolve(false));
    req.end();
  });
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("ERROR: No INSTAGRAM_TOKEN"); return; }
  if (!IK_IMAGES.privateKey) { console.error("ERROR: Missing IMAGEKIT_PRIVATE_KEY"); return; }
  if (!R2.accessKeyId || !R2.secretAccessKey || !R2.endpoint) { console.error("ERROR: Missing R2 credentials"); return; }

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
  } else {
    console.log("Token OK:", testResp.username || testResp.id);
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
    const raw = fs.readFileSync("gallery-data.js", "utf8")
      .replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existing = JSON.parse(raw);
  } catch(e) {}
  const existingById = {};
  existing.forEach(e => { if (e.item_id) existingById[e.item_id] = e; });

  // Load hidden items
  let hiddenUrls = new Set();
  try {
    const settings = JSON.parse(fs.readFileSync("gallery-settings.json", "utf8"));
    (settings.hidden || []).forEach(u => hiddenUrls.add(u));
    console.log(`Hidden items: ${hiddenUrls.size}`);
  } catch(e) {}

  const gallery = [], seenUrls = new Set();
  const cleanCaption = (s) => (s||"").replace(/[⁨⁩‪-‮​-‏⁠-⁤﻿`]/g,"").substring(0,80).trim();

  for (const item of rawPosts) {
    const isVideo = item.media_type === "VIDEO";

    // Skip if hidden
    if (existingById[item.id] && hiddenUrls.has(existingById[item.id].u)) {
      process.stdout.write("H"); continue;
    }

    // Already in gallery
    if (existingById[item.id]) {
      const e = existingById[item.id];
      if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
      process.stdout.write("."); continue;
    }

    if (isVideo) {
      const fileName = `yarden_${item.id}.mp4`;
      const thumbFileName = `yarden_${item.id}_thumb.jpg`;

      // Check R2
      const existsInR2 = await checkExistsR2(fileName);
      if (existsInR2) {
        const entry = { u: `${R2.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, video: true, thumb: `${IK_IMAGES.urlEndpoint}/instagram/${thumbFileName}` };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
        process.stdout.write("~"); continue;
      }

      console.log(`\nUploading video ${item.id}...`);
      try {
        // Download video
        const { buffer, contentType } = await downloadBuffer(item.media_url);
        const r2Result = await uploadToR2(buffer, fileName, contentType);
        if (r2Result.status === 200) {
          // Upload thumbnail to ImageKit
          let thumbUrl = "";
          if (item.thumbnail_url) {
            const thumbResult = await uploadToImageKit(item.thumbnail_url, thumbFileName);
            thumbUrl = thumbResult?.url || "";
          }
          const entry = { u: `${R2.publicUrl}/${fileName}`, a: cleanCaption(item.caption), item_id: item.id, video: true, thumb: thumbUrl };
          if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
          console.log(`Video uploaded OK: ${fileName}`);
        } else {
          console.error(`R2 upload failed for ${item.id}: HTTP ${r2Result.status} ${r2Result.body}`);
        }
      } catch(e) {
        console.error(`Video upload error for ${item.id}:`, e.message);
      }
    } else {
      const fileName = `yarden_${item.id}.jpg`;
      const ikExisting = await checkExistsImageKit(fileName);
      if (ikExisting) {
        const entry = { u: `${IK_IMAGES.urlEndpoint}/instagram/${fileName}`, a: cleanCaption(item.caption), item_id: item.id };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
        process.stdout.write("~"); continue;
      }
      const result = await uploadToImageKit(item.media_url, fileName);
      if (result && result.url) {
        const entry = { u: result.url, a: cleanCaption(item.caption), item_id: item.id };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
      } else { console.error(`Image upload failed for ${item.id}:`, JSON.stringify(result)); }
    }
  }

  console.log(`\nSaving ${gallery.length} items to gallery-data.js`);
  fs.writeFileSync("gallery-data.js", `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);

  console.log("Fetching stats...");
  const uniquePostIds = [...new Set(rawPosts.map(p => p.post_id || p.id).filter(Boolean))];
  const stats = {};
  for (const id of uniquePostIds) {
    try {
      const data = await get(`https://${baseHost}/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`);
      stats[id] = {
        likes: data.like_count || 0,
        comments_count: data.comments_count || 0,
        comments: (data.comments?.data || []).map(c => ({ username: c.username||"", text: c.text||"", timestamp: c.timestamp||"" }))
      };
    } catch(e) { stats[id] = { likes: 0, comments_count: 0, comments: [] }; }
  }
  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`Done. ${uniquePostIds.length} posts.`);
})();
