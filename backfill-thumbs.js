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
const VIDEOS_PUBLIC = "https://videos-new.yardendamri.co.il";
const { execSync } = require("child_process");

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

// Build the small 600px WebP grid thumbnail (same template as the image grid in fix.js).
function makeThumb(buffer) {
  const sharp = require("sharp");
  return sharp(buffer).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
}

// Data-driven, R2-only backfill. Reads the ROOT gallery-data.js purely for the list of
// item ids + types, then ensures EVERY item has a yarden_<id>_thumb.webp on R2 so the grid
// (which derives _thumb.webp from the id) never falls back to a full-resolution file or a
// brown placeholder. No Instagram dependency, no gallery-data.js rewrite, no commit — it only
// uploads missing thumbnails to R2. Resumable: skips any item whose _thumb.webp already exists.
//   - image: downscale the existing full yarden_<id>.webp
//   - video: downscale the existing _thumb.jpg, or (if missing) extract the first frame of the
//            R2 .mp4 with ffmpeg and create both _thumb.jpg (poster/OG) and _thumb.webp.
async function main() {
  try { require("sharp"); } catch(e) { console.log("installing sharp..."); execSync("npm install sharp", { stdio: "inherit" }); }
  let hasFfmpeg = false;
  try { execSync("which ffmpeg", { stdio: "pipe" }); hasFfmpeg = true; } catch(e) {}
  console.log("ffmpeg:", hasFfmpeg);

  const raw = fs.readFileSync("gallery-data.js", "utf8");
  const m = raw.match(/GALLERY_IMAGES\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!m) { console.error("Could not parse gallery-data.js"); process.exit(1); }
  const entries = JSON.parse(m[1]);

  const items = [];
  const seen = new Set();
  for (const e of entries) {
    const id = e.item_id || (String(e.u||"").match(/yarden_(\d+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ id, video: !!e.video });
  }
  const vids = items.filter(i => i.video).length;
  console.log(`${items.length} items (${vids} videos, ${items.length - vids} images) to ensure`);

  let done = 0, skipped = 0, failed = 0, i = 0;
  for (const it of items) {
    i++;
    const webpKey = `yarden_${it.id}_thumb.webp`;
    try {
      if (await headExists(webpKey)) { skipped++; continue; }
      let srcBuf = null;
      if (it.video) {
        const jpgKey = `yarden_${it.id}_thumb.jpg`;
        if (await headExists(jpgKey)) {
          srcBuf = await downloadBuffer(`${R2_IMAGES.publicUrl}/${jpgKey}`);
        } else if (hasFfmpeg) {
          const tin = `/tmp/bf_${it.id}.mp4`, tfr = `/tmp/bf_${it.id}.jpg`;
          fs.writeFileSync(tin, await downloadBuffer(`${VIDEOS_PUBLIC}/yarden_${it.id}.mp4`));
          execSync(`ffmpeg -y -i "${tin}" -vf "select=eq(n\\,0)" -vframes 1 "${tfr}"`, { stdio: "pipe", timeout: 60000 });
          srcBuf = fs.readFileSync(tfr);
          await uploadToR2(srcBuf, jpgKey, "image/jpeg");   // restore the missing poster/OG jpg too
          try { fs.unlinkSync(tin); fs.unlinkSync(tfr); } catch(_) {}
        }
      } else {
        srcBuf = await downloadBuffer(`${R2_IMAGES.publicUrl}/yarden_${it.id}.webp`);
      }
      if (!srcBuf || !srcBuf.length) { failed++; console.log(`no source for ${it.id}`); continue; }
      const webp = await makeThumb(srcBuf);
      const r = await uploadToR2(webp, webpKey, "image/webp");
      if (r.status === 200) { done++; if (done % 25 === 0) console.log(`...created ${done} (at ${i}/${items.length})`); }
      else { failed++; console.error(`upload ${it.id}: ${r.status}`); }
    } catch(err) { failed++; console.error(`fail ${it.id}: ${err.message}`); }
  }
  console.log(`Backfill complete. created:${done} skipped:${skipped} failed:${failed}`);
}
main().catch(e => { console.error(e); process.exit(1); });
