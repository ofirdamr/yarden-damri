const https = require("https");
const fs = require("fs");

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    }).on("error", () => resolve({}));
  });
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.log("❌ No token"); return; }

  console.log("Fetching media...");
  let posts = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count&limit=100&access_token=${token}`;

  while (url) {
    console.log("Fetching batch...");
    const res = await get(url);
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await get(
          `https://graph.instagram.com/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`
        );
        for (const child of children.data || []) {
          posts.push({ ...child, caption: item.caption, like_count: item.like_count, comments_count: item.comments_count, post_id: item.id });
        }
      } else {
        posts.push({ ...item, post_id: item.id });
      }
    }
    url = res.paging?.next || null;
  }

  console.log(`Total items: ${posts.length}`);

  // Build gallery-data.js (images)
  const gallery = posts.map((m) => ({
    u: m.media_url,
    a: (m.caption || "").substring(0, 200),
    id: m.post_id || m.id,
    ...(m.media_type === "VIDEO" && { video: true, thumb: m.thumbnail_url }),
  }));
  const content = `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`;
  fs.writeFileSync("gallery-data.js", content);
  console.log(`✅ Saved ${gallery.length} items to gallery-data.js`);

  // Fetch comments for each unique post
  console.log("Fetching comments...");
  const uniquePostIds = [...new Set(posts.map(p => p.post_id || p.id).filter(Boolean))];
  const stats = {};

  for (const id of uniquePostIds) {
    try {
      const data = await get(
        `https://graph.instagram.com/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`
      );
      stats[id] = {
        likes: data.like_count || 0,
        comments_count: data.comments_count || 0,
        comments: (data.comments?.data || []).map(c => ({
          username: c.username || "",
          text: c.text || "",
          timestamp: c.timestamp || ""
        }))
      };
      console.log(`  ✓ ${id}: ${stats[id].likes} likes, ${stats[id].comments_count} comments`);
    } catch(e) {
      stats[id] = { likes: 0, comments_count: 0, comments: [] };
    }
  }

  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`✅ Saved stats for ${uniquePostIds.length} posts to instagram-stats.json`);
})();
