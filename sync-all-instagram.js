/**
 * sync-all-instagram.js
 * סקריפט חד-פעמי — מושך את כל ההיסטוריה מאינסטגרם
 * כולל: carousel (כל התמונות), וידאו, pagination
 * 
 * הרצה: node sync-all-instagram.js
 * ENV: INSTAGRAM_TOKEN, CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IG_TOKEN   = process.env.INSTAGRAM_TOKEN;
const CLD_CLOUD  = process.env.CLOUDINARY_CLOUD  || "dfjwxc1cw";
const CLD_KEY    = process.env.CLOUDINARY_API_KEY;
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET;

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = ""; r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res(d); } });
    }).on("error", rej);
  });
}

function uploadToCloudinary(fileUrl, publicId, resourceType = "image") {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "yarden_makeup";
  const toSign = `folder=${folder}&public_id=${publicId}&resource_type=${resourceType}&timestamp=${timestamp}${CLD_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");
  const formData = [
    `file=${encodeURIComponent(fileUrl)}`,
    `folder=${folder}`,
    `public_id=${publicId}`,
    `resource_type=${resourceType}`,
    `timestamp=${timestamp}`,
    `api_key=${CLD_KEY}`,
    `signature=${signature}`
  ].join("&");

  return new Promise((res, rej) => {
    const req = https.request({
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLD_CLOUD}/${resourceType}/upload`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(formData) }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } }); });
    req.on("error", rej); req.write(formData); req.end();
  });
}

async function getAllPosts() {
  const posts = [];
  let url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,video_url,thumbnail_url,timestamp&limit=100&access_token=${IG_TOKEN}`;
  
  while (url) {
    console.log(`📥 מושך פוסטים...`);
    const data = await get(url);
    if (!data.data) { console.error("❌ שגיאת API:", JSON.stringify(data)); break; }
    posts.push(...data.data);
    console.log(`   סה"כ עד כה: ${posts.length}`);
    url = data.paging?.next || null;
    if (url) await new Promise(r => setTimeout(r, 500)); // המתן בין קריאות
  }
  return posts;
}

(async () => {
  if (!IG_TOKEN || !CLD_KEY || !CLD_SECRET) {
    console.error("❌ חסרים ENV vars"); process.exit(1);
  }

  // טען gallery-data.js קיים
  const galleryPath = path.join(__dirname, "gallery-data.js");
  const currentContent = fs.readFileSync(galleryPath, "utf-8");
  const existingIds = new Set([...currentContent.matchAll(/yarden_makeup_(\d+)/g)].map(m => m[1]));
  console.log(`📂 ${existingIds.size} תמונות קיימות בגלריה`);

  // שלוף הכל מאינסטגרם
  const allPosts = await getAllPosts();
  console.log(`\n📸 סה"כ ${allPosts.length} פוסטים באינסטגרם\n`);

  const newEntries = [];

  for (const post of allPosts) {
    const mediaList = [];

    if (post.media_type === "CAROUSEL_ALBUM") {
      try {
        const children = await get(
          `https://graph.instagram.com/${post.id}/children?fields=id,media_type,media_url,video_url,thumbnail_url&access_token=${IG_TOKEN}`
        );
        for (const child of children.data || []) {
          const isVideo = child.media_type === "VIDEO";
          const url = isVideo ? child.video_url : child.media_url;
          if (url) mediaList.push({ id: child.id, url, isVideo, thumbnail: child.thumbnail_url });
        }
      } catch(e) {
        if (post.media_url) mediaList.push({ id: post.id, url: post.media_url, isVideo: false });
      }
    } else if (post.media_type === "VIDEO") {
      if (post.video_url) mediaList.push({ id: post.id, url: post.video_url, isVideo: true, thumbnail: post.thumbnail_url });
    } else if (post.media_url) {
      mediaList.push({ id: post.id, url: post.media_url, isVideo: false });
    }

    for (const media of mediaList) {
      if (existingIds.has(media.id)) {
        console.log(`⏭️  קיים: ${media.id}`);
        continue;
      }

      try {
        const publicId = `yarden_makeup_${media.id}`;
        const resourceType = media.isVideo ? "video" : "image";
        console.log(`⬆️  מעלה ${media.isVideo ? "וידאו" : "תמונה"}: ${publicId}`);
        
        const result = await uploadToCloudinary(media.url, publicId, resourceType);
        
        if (result.secure_url) {
          const entry = { u: result.secure_url, a: (post.caption || "").substring(0, 200) };
          if (media.isVideo && media.thumbnail) entry.thumb = media.thumbnail;
          if (media.isVideo) entry.video = true;
          newEntries.push(entry);
          existingIds.add(media.id);
          console.log(`   ✅ הועלה`);
        } else {
          console.warn(`   ⚠️ נכשל:`, result.error?.message);
        }
      } catch(e) {
        console.error(`   ❌ שגיאה:`, e.message);
      }
      
      await new Promise(r => setTimeout(r, 300)); // המתן בין העלאות
    }
  }

  if (newEntries.length === 0) {
    console.log("\n✅ אין חדש להוסיף");
    process.exit(0);
  }

  // עדכן gallery-data.js
  const jsonStr = currentContent
    .replace(/^\/\/ Auto-generated gallery data\n/, "")
    .replace(/^const GALLERY_IMAGES = /, "")
    .replace(/;?\s*$/, "");

  const existing = JSON.parse(jsonStr);
  const merged = [...newEntries, ...existing];
  fs.writeFileSync(galleryPath, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(merged)};`, "utf-8");
  
  console.log(`\n✅ נוספו ${newEntries.length} פריטים חדשים לגלריה`);
})();
