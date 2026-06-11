const https = require("https");
const fs = require("fs");

function get(url, timeoutMs=10000) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location, timeoutMs).then(resolve);
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
      }).on("error", () => resolve({}));
      req.setTimeout(timeoutMs, () => { req.destroy(); resolve({}); });
    } catch(e) { resolve({}); }
  });
}

function safeWrite(path, data) {
  const safe = data.replace(/[\uD800-\uDFFF]/g, '');
  fs.writeFileSync(path, safe, 'utf8');
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("No token"); return; }

  // Load gallery
  const raw = fs.readFileSync("preview/gallery-data.js", "utf8")
    .replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
  const gallery = JSON.parse(raw);

  // Load existing stats
  let stats = {};
  try { stats = JSON.parse(fs.readFileSync("preview/instagram-stats.json", "utf8")); } catch(e) {}
  const statsIds = new Set(Object.keys(stats));

  // Find items missing stats - get their IDs to try fetching
  const missingIds = [...new Set(
    gallery
      .filter(g => !statsIds.has(String(g.post_id || g.item_id || '')))
      .map(g => String(g.item_id || ''))
      .filter(Boolean)
  )];
  console.log(`Missing stats for ${missingIds.length} items`);

  // For each missing item, try fetching it directly to get its parent post
  // Instagram API: GET /{media-id}?fields=id,media_type,like_count,comments_count
  // If it's a carousel child, we need its parent
  const idToPostId = {};
  const BATCH = 20;
  for (let i = 0; i < missingIds.length; i += BATCH) {
    const batch = missingIds.slice(i, i + BATCH);
    await Promise.all(batch.map(async id => {
      const data = await get(`https://graph.facebook.com/${id}?fields=id,media_type,like_count,comments_count&access_token=${token}`);
      if (data.like_count !== undefined) {
        // It's a top-level post - store stats directly
        stats[id] = { likes: data.like_count || 0, comments_count: data.comments_count || 0, comments: [] };
        statsIds.add(id);
        idToPostId[id] = id;
        process.stdout.write("+");
      } else {
        process.stdout.write("?");
      }
    }));
  }
  console.log(`\nFetched ${Object.keys(idToPostId).length} new stats`);

  // Update post_id on gallery items
  let updated = 0;
  for (const g of gallery) {
    const id = String(g.item_id || '');
    if (idToPostId[id]) {
      g.post_id = idToPostId[id];
      updated++;
    }
  }
  console.log(`Updated ${updated} gallery items`);

  safeWrite("preview/instagram-stats.json", JSON.stringify(stats, null, 2));
  safeWrite("instagram-stats.json", JSON.stringify(stats, null, 2));

  const out = "// Auto-generated gallery data\nconst GALLERY_IMAGES = " + JSON.stringify(gallery, null, 2) + ";";
  safeWrite("preview/gallery-data.js", out);
  safeWrite("gallery-data.js", out);
  console.log("Done");
})();
