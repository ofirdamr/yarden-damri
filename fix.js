const https = require("https");
const fs = require("fs");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on("error", reject);
  });
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) {
    console.log("❌ No token");
    return;
  }

  console.log("Fetching media...");
  let media = [];
  let url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=100&access_token=${token}`;

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
          media.push({ ...child, caption: item.caption });
        }
      } else {
        media.push(item);
      }
    }
    url = res.paging?.next || null;
  }

  console.log(`Total items: ${media.length}`);

  const gallery = media.map((m) => ({
    u: m.media_url,
    a: (m.caption || "").substring(0, 200),
    ...(m.media_type === "VIDEO" && { video: true, thumb: m.thumbnail_url }),
  }));

  fs.writeFileSync(
    "./gallery-data.js",
    `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`
  );

  console.log(`✅ Saved ${gallery.length} items (${gallery.filter((i) => i.video).length} videos)`);
})();
