const https = require("https");
const fs = require("fs");

const IK_IMAGES = {
  privateKey: process.env.IK_PRIVATE_IMAGES,
  urlEndpoint: "https://ik.imagekit.io/Yardendamri"
};
const IK_VIDEOS = {
  privateKey: process.env.IK_PRIVATE_VIDEOS,
  urlEndpoint: "https://ik.imagekit.io/yardenvideos"
};

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    }).on("error", () => resolve({}));
  });
}

function uploadToImageKit(mediaUrl, fileName, isVideo) {
  const ik = isVideo ? IK_VIDEOS : IK_IMAGES;
  const auth = Buffer.from(ik.privateKey + ":").toString("base64");
  const body = JSON.stringify({ file: mediaUrl, fileName, folder: "/instagram", useUniqueFileName: false });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "upload.imagekit.io", path: "/api/v1/files/upload", method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}`, "Content-Length": Buffer.byteLength(body) }
    }, (res) => {
      let d = ""; res.on("data", (c) => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function checkExistsImageKit(fileName, isVideo) {
  const ik = isVideo ? IK_VIDEOS : IK_IMAGES;
  const auth = Buffer.from(ik.privateKey + ":").toString("base64");
  return new Promise((resolve) => {
    https.get({
      hostname: "api.imagekit.io",
      path: `/api/v1/files?searchQuery=name%3D"${encodeURIComponent(fileName)}"&limit=1`,
      headers: { "Authorization": `Basic ${auth}` }
    }, (res) => {
      let d = ""; res.on("data", (c) => d += c);
      res.on("end", () => { try { const a = JSON.parse(d); resolve(Array.isArray(a) && a.length ? a[0] : null); } catch(e) { resolve(null); } });
    }).on("error", () => resolve(null));
  });
}

(async () => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) { console.error("ERROR: No INSTAGRAM_TOKEN"); return; }
  if (!IK_IMAGES.privateKey || !IK_VIDEOS.privateKey) { console.error("ERROR: Missing IK_PRIVATE_IMAGES or IK_PRIVATE_VIDEOS"); return; }

  let mediaBaseId = "me", baseHost = "graph.instagram.com";
  const testResp = await get(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
  if (testResp.error) {
    const fbResp = await get(`https://graph.facebook.com/me?fields=id,name&access_token=${token}`);
    if (fbResp.error) { console.error("TOKEN ERROR:", JSON.stringify(fbResp.error)); return; }
    const pages = await get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
    for (const page of pages.data || []) {
      const p = await get(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${token}`);
      if (p.instagram_business_account) { mediaBaseId = p.instagram_business_account.id; baseHost = "graph.facebook.com"; break; }
    }
    if (mediaBaseId === "me") { console.error("No Instagram Business Account found"); return; }
  } else {
    console.log("Token OK:", testResp.username || testResp.id);
  }

  console.log("Fetching media...");
  let rawPosts = [];
  let url = `https://${baseHost}/${mediaBaseId}/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count&limit=100&access_token=${token}`;
  while (url) {
    const res = await get(url);
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const ch = await get(`https://${baseHost}/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`);
        for (const c of ch.data || []) rawPosts.push({ ...c, caption: item.caption, like_count: item.like_count, comments_count: item.comments_count, post_id: item.id });
      } else {
        rawPosts.push({ ...item, post_id: item.id });
      }
    }
    url = res.paging?.next || null;
  }
  console.log(`Fetched ${rawPosts.length} items`);

  let existing = [];
  try {
    const raw = fs.readFileSync("gallery-data.js", "utf8")
      .replace("// Auto-generated gallery data\nconst GALLERY_IMAGES = ", "").replace(/;$/, "");
    existing = JSON.parse(raw);
  } catch(e) {}
  const existingById = {};
  existing.forEach(e => { if (e.item_id) existingById[e.item_id] = e; });

  const gallery = [], seenUrls = new Set();
  const cleanCaption = (s) => (s||"").replace(/[⁨⁩‪-‮​-‏⁠-⁤﻿`]/g,"").substring(0,80).trim();

  for (const item of rawPosts) {
    const isVideo = item.media_type === "VIDEO";

    if (existingById[item.id]) {
      const e = existingById[item.id];
      if (!seenUrls.has(e.u)) { seenUrls.add(e.u); gallery.push(e); }
      process.stdout.write("."); continue;
    }

    const fileName = `yarden_${item.id}${isVideo ? ".mp4" : ".jpg"}`;
    const ikExisting = await checkExistsImageKit(fileName, isVideo);
    if (ikExisting) {
      const ik = isVideo ? IK_VIDEOS : IK_IMAGES;
      const entry = { u: `${ik.urlEndpoint}/instagram/${fileName}`, a: cleanCaption(item.caption), item_id: item.id };
      if (isVideo) { entry.video = true; entry.thumb = item.thumbnail_url || ""; }
      if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
      process.stdout.write("~"); continue;
    }

    console.log(`\nUploading ${item.id} (${item.media_type})...`);
    if (isVideo) {
      const thumbFile = `yarden_${item.id}_thumb.jpg`;
      const thumbResult = await uploadToImageKit(item.thumbnail_url || item.media_url, thumbFile, false);
      const videoResult = await uploadToImageKit(item.media_url, fileName, true);
      if (videoResult && videoResult.url) {
        const entry = { u: videoResult.url, a: cleanCaption(item.caption), item_id: item.id, video: true, thumb: thumbResult?.url || "" };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
      } else { console.error(`Video upload failed for ${item.id}:`, JSON.stringify(videoResult)); }
    } else {
      const result = await uploadToImageKit(item.media_url, fileName, false);
      if (result && result.url) {
        const entry = { u: result.url, a: cleanCaption(item.caption), item_id: item.id };
        if (!seenUrls.has(entry.u)) { seenUrls.add(entry.u); gallery.push(entry); }
      } else { console.error(`Image upload failed for ${item.id}:`, JSON.stringify(result)); }
    }
  }

  console.log(`\nSaving ${gallery.length} items to gallery-data.js`);
  fs.writeFileSync("gallery-data.js", `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(gallery, null, 2)};`);

  console.log("Fetching stats...");
  const uniquePostIds = [...new Set(rawPosts.map(p => p.post_id || p.id).filter(Boolean))];
  const stats = {};
  for (const id of uniquePostIds) {
    try {
      const data = await get(`https://${baseHost}/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`);
      stats[id] = {
        likes: data.like_count || 0,
        comments_count: data.comments_count || 0,
        comments: (data.comments?.data || []).map(c => ({ username: c.username||"", text: c.text||"", timestamp: c.timestamp||"" }))
      };
    } catch(e) { stats[id] = { likes: 0, comments_count: 0, comments: [] }; }
  }
  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`Done. ${uniquePostIds.length} posts.`);
})();
