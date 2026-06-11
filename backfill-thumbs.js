const https = require("https");
const fs = require("fs");
const crypto = require("crypto");

const R2_IMAGES = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucket: "yarden-images",
  publicUrl: "https://images.yardendamri.co.il"
};

function get(url) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location).then(resolve);
        let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
      }).on("error", () => resolve({}));
      req.setTimeout(15000, () => { req.destroy(); resolve({}); });
    } catch(e) { resolve({}); }
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    try {
      const req = https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return downloadBuffer(res.headers.location).then(resolve).catch(reject);
        const chunks = []; res.on("data", c => chunks.push(c)); res.on("end", () => resolve(Buffer.concat(chunks)));
      }).on("error", reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error("timeout")); });
    } catch(e) { reject(e); }
  });
}

async function uploadToR2(buffer, fileName, contentType) {
  const endpoint = new URL(R2_IMAGES.endpoint);
  const host = endpoint.hostname;
  const path = `/${R2_IMAGES.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0,10).replace(/-/g,"");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,"").slice(0,15)+"Z";
  const region = "auto", service = "s3";
  const payloadHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4"+R2_IMAGES.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_IMAGES.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host, path, method: "PUT",
      headers: { "Content-Type": contentType, "Content-Length": buffer.length, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "Authorization": authorization }
    }, (res) => { let d=""; res.on("data",c=>d+=c); res.on("end",()=>resolve({status:res.statusCode,body:d})); });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("upload timeout")); });
    req.write(buffer); req.end();
  });
}

async function headExists(fileName) {
  const endpoint = new URL(R2_IMAGES.endpoint);
  const host = endpoint.hostname;
  const path = `/${R2_IMAGES.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0,10).replace(/-/g,"");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,"").slice(0,15)+"Z";
  const region = "auto", service = "s3";
  const payloadHash = crypto.createHash("sha256").update("").digest("hex");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `HEAD\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4"+R2_IMAGES.secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_IMAGES.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve) => {
    const req = https.request({ hostname: host, path, method: "HEAD",
      headers: { "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash, "Authorization": authorization } },
      (res) => resolve(res.statusCode === 200));
    req.on("error", () => resolve(false));
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function main() {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("No INSTAGRAM_TOKEN"); process.exit(1); }

  const galleryRaw = fs.readFileSync("preview/gallery-data.js", "utf8");
  const jsonPart = galleryRaw.replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ","").replace(/\nconst HERO_[\s\S]*/,"").replace(/;$/,"");
  const entries = JSON.parse(jsonPart);
  const videoIds = entries.filter(e => e.video && e.item_id).map(e => e.item_id);
  console.log(`${videoIds.length} videos to process`);

  let baseHost = "graph.instagram.com";
  const test = await get(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
  if (test.error) {
    const pages = await get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
    for (const page of (pages.data||[])) {
      const p = await get(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${token}`);
      if (p.instagram_business_account) { baseHost = "graph.facebook.com"; break; }
    }
  }

  let done = 0, skipped = 0, failed = 0;
  const BATCH = 10;
  for (let i = 0; i < videoIds.length; i += BATCH) {
    const batch = videoIds.slice(i, i + BATCH);
    await Promise.all(batch.map(async (id) => {
      const thumbKey = `yarden_${id}_thumb.jpg`;
      if (await headExists(thumbKey)) { skipped++; return; }
      const data = await get(`https://${baseHost}/${id}?fields=thumbnail_url,media_url&access_token=${token}`);
      const thumbSrc = data.thumbnail_url || data.media_url;
      if (!thumbSrc) { console.log(`No thumb for ${id}`); failed++; return; }
      try {
        const buf = await downloadBuffer(thumbSrc);
        const r = await uploadToR2(buf, thumbKey, "image/jpeg");
        if (r.status === 200) { done++; console.log(`✓ ${id} (${done})`); }
        else { console.error(`✗ upload ${id}: ${r.status}`); failed++; }
      } catch(e) { console.error(`✗ ${id}: ${e.message}`); failed++; }
    }));
  }

  // Update thumb fields in gallery-data.js
  for (const e of entries) {
    if (e.video && e.item_id) e.thumb = `${R2_IMAGES.publicUrl}/yarden_${e.item_id}_thumb.jpg`;
  }
  const heroMatch = galleryRaw.match(/(\nconst HERO_[\s\S]*)/);
  const heroLine = heroMatch ? heroMatch[1] : "";
  const safe = s => s.replace(/[\uD800-\uDFFF]/g,"");
  fs.writeFileSync("preview/gallery-data.js", safe(`// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(entries, null, 2)};${heroLine}`), "utf8");
  console.log(`Done:${done} Skipped:${skipped} Failed:${failed}`);
}
main().catch(console.error);
