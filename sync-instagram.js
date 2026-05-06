/**
 * scripts/sync-instagram.js
 * רץ ב-GitHub Actions כל לילה — מסנכרן פוסטים חדשים מ-Instagram לגלריה
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IG_TOKEN   = process.env.INSTAGRAM_TOKEN;
const CLD_CLOUD  = process.env.CLOUDINARY_CLOUD  || "dfjwxc1cw";
const CLD_KEY    = process.env.CLOUDINARY_API_KEY;
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET;

// ── helpers ──────────────────────────────────

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res(d); } });
    }).on("error", rej);
  });
}

function uploadToCloudinary(imageUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "yarden_makeup";
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLD_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const formData = [
    `file=${encodeURIComponent(imageUrl)}`,
    `folder=${folder}`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
    `api_key=${CLD_KEY}`,
    `signature=${signature}`
  ].join("&");

  return new Promise((res, rej) => {
    const opts = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLD_CLOUD}/image/upload`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(formData)
      }
    };
    const req = https.request(opts, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    });
    req.on("error", rej);
    req.write(formData);
    req.end();
  });
}

// ── main ─────────────────────────────────────

(async () => {
  if (!IG_TOKEN || !CLD_KEY || !CLD_SECRET) {
    console.error("❌ Missing env vars");
    process.exit(1);
  }

  // 1. קרא gallery-data.js הנוכחי
  const galleryPath = path.join(__dirname, "gallery-data.js");
  const currentContent = fs.readFileSync(galleryPath, "utf-8");

  // חלץ IDs קיימים
  const existingIds = new Set(
    [...currentContent.matchAll(/yarden_makeup_(\d+)/g)].map(m => m[1])
  );
  console.log(`📂 ${existingIds.size} existing images in gallery`);

  // 2. שלוף פוסטים אחרונים מ-Instagram
  const igUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,timestamp&limit=50&access_token=${IG_TOKEN}`;
  const igData = await get(igUrl);

  if (!igData.data) {
    console.error("❌ Instagram API error:", JSON.stringify(igData));
    process.exit(1);
  }

  const posts = igData.data.filter(
    p => (p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM") && p.media_url
  );
  console.log(`📸 ${posts.length} posts from Instagram`);

  // 3. רק פוסטים חדשים
  const newPosts = posts.filter(p => !existingIds.has(p.id));
  console.log(`🆕 ${newPosts.length} new posts to sync`);

  if (newPosts.length === 0) {
    console.log("✅ Nothing new — done");
    process.exit(0);
  }

  // 4. העלה לCloudinary — כולל תמונות carousel
  const newEntries = [];
  for (const post of newPosts) {
    const imagesToUpload = [];

    if (post.media_type === "CAROUSEL_ALBUM") {
      // שלוף את כל תמונות הcarousel
      try {
        const children = await get(
          `https://graph.instagram.com/${post.id}/children?fields=id,media_type,media_url&access_token=${IG_TOKEN}`
        );
        if (children.data) {
          for (const child of children.data) {
            if (child.media_url) imagesToUpload.push({ url: child.media_url, id: child.id });
          }
        }
      } catch(e) {
        imagesToUpload.push({ url: post.media_url, id: post.id });
      }
    } else {
      imagesToUpload.push({ url: post.media_url, id: post.id });
    }

    for (const img of imagesToUpload) {
      try {
        const publicId = `yarden_makeup_${img.id}`;
        console.log(`⬆️  Uploading ${publicId}...`);
        const result = await uploadToCloudinary(img.url, publicId);
        if (result.secure_url) {
          newEntries.push({ u: result.secure_url, a: (post.caption || "").substring(0, 200) });
        }
      } catch(e) {
        console.error(`❌ ${img.id}:`, e.message);
      }
    }
  }

  if (newEntries.length === 0) {
    console.log("⚠️ No new entries uploaded");
    process.exit(0);
  }

  // 5. עדכן gallery-data.js — פוסטים חדשים ראשונים
  const jsonStr = currentContent
    .replace(/^\/\/ Auto-generated gallery data\n/, "")
    .replace(/^const GALLERY_IMAGES = /, "")
    .replace(/;?\s*$/, "");

  const existing = JSON.parse(jsonStr);
  const merged = [...newEntries, ...existing];
  const newFile = `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(merged)};`;

  fs.writeFileSync(galleryPath, newFile, "utf-8");
  console.log(`\n✅ Added ${newEntries.length} new images to gallery-data.js`);
  // GitHub Actions יעשה git commit & push אוטומטית
})();
