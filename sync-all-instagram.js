const https = require("https");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fetchAllMedia() {
  let media = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=100&access_token=${process.env.INSTAGRAM_TOKEN}`;

  while (url) {
    const res = await fetch(url).then(r => r.json());
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await fetch(`https://graph.instagram.com/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${process.env.INSTAGRAM_TOKEN}`).then(r => r.json());
        for (const child of children.data || []) {
          media.push({ ...child, caption: item.caption, timestamp: item.timestamp });
        }
      } else {
        media.push(item);
      }
    }
    url = res.paging?.next;
  }
  return media;
}

async function uploadToCloudinary(item) {
  const isVideo = item.media_type === "VIDEO";
  const publicId = `yarden_makeup_${item.id}`;
  
  let result;
  try {
    result = await cloudinary.uploader.upload(item.media_url, {
      public_id: publicId,
      folder: "yarden_makeup",
      resource_type: isVideo ? "video" : "image",
    });
  } catch (err) {
    console.error(`Upload failed for ${item.id}:`, err.message);
    return null;
  }

  const entry = {
    u: result.secure_url,
    a: item.caption?.substring(0, 200) || "",
  };
  
  if (isVideo) {
    entry.video = true;
    if (item.thumbnail_url) entry.thumb = item.thumbnail_url;
  }
  
  return entry;
}

(async () => {
  console.log("Fetching media from Instagram...");
  const media = await fetchAllMedia();
  console.log(`Total media items: ${media.length}`);

  const galleryPath = "./gallery-data.js";
  const existingContent = fs.readFileSync(galleryPath, "utf-8");
  const existingMatch = existingContent.match(/const GALLERY_IMAGES = (\[[\s\S]*?\]);/);
  const existing = JSON.parse(existingMatch[1]);
  const existingIds = new Set(existing.map(e => e.u?.match(/yarden_makeup_(\d+)/)?.[1]).filter(Boolean));

  const newItems = [];
  for (const item of media) {
    if (!existingIds.has(item.id)) {
      console.log(`Uploading ${item.id} (${item.media_type})`);
      const uploaded = await uploadToCloudinary(item);
      if (uploaded) {
        newItems.push(uploaded);
        existingIds.add(item.id);
      }
    } else {
      console.log(`Skipping ${item.id} (already exists)`);
    }
  }

  if (newItems.length) {
    const updated = [...newItems, ...existing];
    fs.writeFileSync(galleryPath, `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(updated, null, 2)};`);
    console.log(`✅ Added ${newItems.length} new items (${newItems.filter(i => i.video).length} videos).`);
  } else {
    console.log("✅ No new items.");
  }
})();
