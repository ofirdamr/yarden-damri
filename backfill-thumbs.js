const https = require("https");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const R2_IMAGES = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucket: "yarden-images",
  publicUrl: "https://images.yardendamri.co.il"
};

function downloadBuffer(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const req = lib.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302)
          return downloadBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }).on("error", reject);
      req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("timeout")); });
    } catch (e) { reject(e); }
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

async function headR2(cfg, fileName) {
  const endpoint = new URL(cfg.endpoint);
  const host = endpoint.hostname;
  const path = `/${cfg.bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const region = "auto", service = "s3";
  const payloadHash = crypto.createHash("sha256").update("").digest("hex");
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
    }, (res) => { resolve(res.statusCode); });
    req.on("error", () => resolve(0));
    req.setTimeout(10000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

async function main() {
  // Read gallery-data.js to get all video item_ids
  const galleryData = fs.readFileSync("preview/gallery-data.js", "utf8");
  const matches = [...galleryData.matchAll(/"u":\s*"(https:\/\/videos-new\.yardendamri\.co\.il\/yarden_([^"]+)\.mp4)"/g)];
  console.log(`Found ${matches.length} videos`);

  let done = 0, skipped = 0, failed = 0;

  for (const [, videoUrl, itemId] of matches) {
    const thumbKey = `yarden_${itemId}_thumb.jpg`;
    
    // Check if thumb already exists
    const status = await headR2(R2_IMAGES, thumbKey);
    if (status === 200) {
      skipped++;
      if (skipped % 20 === 0) console.log(`Skipped ${skipped} already existing...`);
      continue;
    }

    try {
      // Download video
      const tmpVideo = `/tmp/bfv_${itemId}.mp4`;
      const tmpThumb = `/tmp/bft_${itemId}.jpg`;
      
      console.log(`Processing ${itemId}...`);
      const videoBuf = await downloadBuffer(videoUrl);
      fs.writeFileSync(tmpVideo, videoBuf);
      
      // Extract frame 0
      execSync(`ffmpeg -y -i "${tmpVideo}" -vf "select=eq(n\\,0)" -vframes 1 "${tmpThumb}"`, { stdio: "pipe", timeout: 30000 });
      
      const thumbBuf = fs.readFileSync(tmpThumb);
      fs.unlinkSync(tmpVideo);
      fs.unlinkSync(tmpThumb);
      
      const r = await uploadToR2(R2_IMAGES, thumbBuf, thumbKey, "image/jpeg");
      if (r.status === 200) {
        done++;
        console.log(`✓ ${itemId} (${done} done)`);
      } else {
        console.error(`✗ Upload failed ${itemId}: ${r.status} ${r.body}`);
        failed++;
      }
    } catch (e) {
      console.error(`✗ Error ${itemId}: ${e.message}`);
      failed++;
      // cleanup
      try { fs.unlinkSync(`/tmp/bfv_${itemId}.mp4`); } catch {}
      try { fs.unlinkSync(`/tmp/bft_${itemId}.jpg`); } catch {}
    }
  }

  console.log(`\nDone: ${done}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
