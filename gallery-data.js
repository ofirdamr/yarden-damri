const https = require("https");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    }).on("error", reject);
  });
}

async function getAllMedia() {
  let media = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=100&access_token=${process.env.INSTAGRAM_TOKEN}`;
  
  while (url) {
    const data = await fetch(url);
    if (!data.data) break;
    
    for (const item of data.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await fetch(`https://graph.instagram.com/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${process.env.INSTAGRAM_TOKEN}`);
        for (const child of children.data || []) {
          media.push({ ...child, caption: item.caption, timestamp: item.timestamp });
        }
      } else {
        media.push(item);
      }
    }
    url = data.paging?.next || null;
  }
  return media;
}

async function uploadToCloudinary(item) {
  const isVideo = item.media_type === "VIDEO";
  const publicId = `yarden_makeup_${item.id}`;
  const resourceType = isVideo ? "video" : "image";
  
  const result = await cloudinary.uploader.upload(item.media_url, {
    public_id: publicId,
    folder: "yarden_makeup",
    resource_type: resourceType,
    overwrite: false
  });
  
  const entry = {
    u: result.secure_url,
    a: (item.caption || "").substring(0, 200)
  };
  
  if (isVideo) {
    entry.video = true;
    if (item.thumbnail_url) entry.thumb = item.thumbnail_url;
  }
  
  return entry;
}

(async () => {
  console.log("Fetching media from Instagram...");
  const media = await getAllMedia();
  console.log(`Found ${media.length} items`);

  const galleryPath = "./gallery-data.js";
  const content = fs.readFileSync(galleryPath, "utf-8");
  const match = content.match(/const GALLERY_IMAGES = (\[[\s\S]*?\]);/);
  const existing = JSON.parse(match[1]);
  const existingIds = new Set(existing.map(e => e.u?.match(/yarden_makeup_(\d+)/)?.[1]).filter(Boolean));

  const newItems = [];
  for (const item of media) {
    if (!existingIds.has(item.id)) {
      console.log(`🆕 Uploading ${item.id} (${item.media_type})`);
      try {
        const uploaded = await uploadToCloudinary(item);
        newItems.push(uploaded);
        existingIds.add(item.id);
      } catch(e) {
        console.error(`❌ Failed ${item.id}:`, e.message);
      }
    }
  }

  if (newItems.length) {
    const updated = [...newItems, ...existing];
    fs.writeFileSync(galleryPath, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(updated, null, 2)};`);
    console.log(`✅ Added ${newItems.length} new items (${newItems.filter(i => i.video).length} videos)`);
  } else {
    console.log("✅ No new items");
  }
})();
