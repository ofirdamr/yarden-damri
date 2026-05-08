const https = require("https");
const fs = require("fs");

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return console.log("❌ No token");

  let media = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=100&access_token=${token}`;
  while (url) {
    const res = await fetch(url).then(r => r.json());
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await fetch(`https://graph.instagram.com/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`).then(r => r.json());
        for (const child of children.data || []) media.push({ ...child, caption: item.caption });
      } else {
        media.push(item);
      }
    }
    url = res.paging?.next;
  }

  const gallery = media.map(m => ({
    u: m.media_url.includes('.mp4') ? m.media_url : m.media_url,
    a: (m.caption || "").substring(0, 200),
    ...(m.media_type === "VIDEO" && { video: true, thumb: m.thumbnail_url })
  }));

  fs.writeFileSync("./gallery-data.js", `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);
  console.log(`✅ Saved ${gallery.length} items (${gallery.filter(i => i.video).length} videos)`);
})();
