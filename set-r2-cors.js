// One-off: set CORS on the R2 buckets so the site can read images/videos
// cross-origin (needed for branded canvas share + fetch). Uses the same R2
// credentials as fix.js. Run via the "Set R2 CORS" GitHub Action.
const https = require("https");
const crypto = require("crypto");

const CORS_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<CORSConfiguration>' +
    '<CORSRule>' +
      '<AllowedOrigin>https://yardendamri.co.il</AllowedOrigin>' +
      '<AllowedOrigin>https://www.yardendamri.co.il</AllowedOrigin>' +
      '<AllowedMethod>GET</AllowedMethod>' +
      '<AllowedMethod>HEAD</AllowedMethod>' +
      '<AllowedHeader>*</AllowedHeader>' +
      '<MaxAgeSeconds>3600</MaxAgeSeconds>' +
    '</CORSRule>' +
  '</CORSConfiguration>';

const BUCKETS = ["yarden-images", "yarden-videos-new"];

function putCors(bucket) {
  const endpoint = new URL(process.env.R2_ENDPOINT);
  const host = endpoint.hostname;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const region = "auto", service = "s3";
  const body = Buffer.from(CORS_XML, "utf8");
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");
  const contentMd5 = crypto.createHash("md5").update(body).digest("base64");
  const uri = `/${bucket}`;
  const query = "cors=";
  const canonicalHeaders =
    `content-md5:${contentMd5}\n` +
    `content-type:application/xml\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-md5;content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${uri}\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const hmac = (k, d) => crypto.createHmac("sha256", k).update(d).digest();
  const signingKey = hmac(hmac(hmac(hmac("AWS4" + secretAccessKey, dateStamp), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: host, path: `/${bucket}?cors`, method: "PUT",
      headers: {
        "Content-Type": "application/xml",
        "Content-Length": body.length,
        "Content-MD5": contentMd5,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorization
      }
    }, (res) => { let d = ""; res.on("data", (c) => d += c); res.on("end", () => resolve({ bucket, status: res.statusCode, body: d })); });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

(async () => {
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) { console.error("Missing R2 env vars"); process.exit(1); }
  let ok = true;
  for (const b of BUCKETS) {
    try {
      const r = await putCors(b);
      console.log(`${b}: HTTP ${r.status} ${r.status === 200 ? "✅ CORS set" : r.body}`);
      if (r.status !== 200) ok = false;
    } catch (e) { console.error(`${b}: ${e.message}`); ok = false; }
  }
  process.exit(ok ? 0 : 1);
})();
