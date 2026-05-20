const https = require("https");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    }).on("error", () => resolve({}));
  });
}

async function uploadToCloudinary(item) {
  const isVideo = item.media_type === "VIDEO";
  const publicId = `yarden_makeup_${item.id}`;
  try {
    // Check if already uploaded
    const existing = await cloudinary.api.resource(`yarden_makeup/${publicId}`, { resource_type: isVideo ? "video" : "image" }).catch(() => null);
    if (existing) {
      const entry = { u: existing.secure_url, a: (item.caption || "").substring(0, 200), id: item.post_id || item.id };
      if (isVideo) { entry.video = true; entry.thumb = item.thumbnail_url || ""; }
      return entry;
    }
    const result = await cloudinary.uploader.upload(item.media_url, {
      public_id: publicId, folder: "yarden_makeup",
      resource_type: isVideo ? "video" : "image",
    });
    const cleanCaption = (s) => (s||'').replace(/[⁨⁩‪-‮​-‏⁠-⁤﻿`]/g,'').substring(0,80).trim();
    const entry = { u: result.secure_url, a: cleanCaption(item.caption), id: item.post_id || item.id };
    if (isVideo) { entry.video = true; entry.thumb = item.thumbnail_url || ""; }
    return entry;
  } catch (err) {
    console.error(`Upload failed for ${item.id}:`, err.message, JSON.stringify(err.error || err));
    return null;
  }
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.log("No token"); return; }

  // 1. Fetch all media from Instagram
  console.log("Fetching media...");
  let rawPosts = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count&limit=100&access_token=${token}`;
  while (url) {
    const res = await get(url);
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await get(`https://graph.instagram.com/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`);
        for (const child of children.data || []) {
          rawPosts.push({ ...child, caption: item.caption, like_count: item.like_count, comments_count: item.comments_count, post_id: item.id });
        }
      } else {
        rawPosts.push({ ...item, post_id: item.id });
      }
    }
    url = res.paging?.next || null;
  }
  console.log(`Fetched ${rawPosts.length} items`);

  // 2. Load existing gallery-data.js to avoid re-uploading
  let existing = [];
  try {
    const raw = fs.readFileSync("gallery-data.js", "utf8").replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existing = JSON.parse(raw);
  } catch(e) {}
  // Key by item.id (child ID for carousels, post ID for singles)
  const existingByItemId = {};
  existing.forEach(e => { if (e.item_id) existingByItemId[e.item_id] = e; });

  // 3. Upload new items to Cloudinary — deduplicate by item URL
  const gallery = [];
  const seenUrls = new Set();
  for (const item of rawPosts) {
    if (existingByItemId[item.id] && existingByItemId[item.id].u.includes('cloudinary')) {
      const e = existingByItemId[item.id];
      if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
      process.stdout.write(".");
    } else {
      console.log(`\nUploading ${item.id}...`);
      const entry = await uploadToCloudinary(item);
      if (entry && !seenUrls.has(entry.u)) {
        entry.item_id = item.id;
        seenUrls.add(entry.u);
        gallery.push(entry);
      }
    }
  }
  console.log(`\nSaving ${gallery.length} items to gallery-data.js`);
  fs.writeFileSync("gallery-data.js", `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);

  // 4. Fetch stats (likes + comments) per post
  console.log("Fetching Instagram stats...");
  const uniquePostIds = [...new Set(rawPosts.map(p => p.post_id || p.id).filter(Boolean))];
  const stats = {};
  for (const id of uniquePostIds) {
    try {
      const data = await get(`https://graph.instagram.com/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`);
      stats[id] = {
        likes: data.like_count || 0,
        comments_count: data.comments_count || 0,
        comments: (data.comments?.data || []).map(c => ({ username: c.username || "", text: c.text || "", timestamp: c.timestamp || "" }))
      };
      console.log(`  ${id}: ${stats[id].likes} likes, ${stats[id].comments_count} comments`);
    } catch(e) {
      stats[id] = { likes: 0, comments_count: 0, comments: [] };
    }
  }
  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`✅ Done. Saved stats for ${uniquePostIds.length} posts.`);
})();
