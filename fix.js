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
  if (!token) { console.error('ERROR: No INSTAGRAM_TOKEN set'); return; }
  console.log('Token prefix:', token.substring(0, 6) + '...');

  // Determine the correct base URL for media fetching.
  // - Instagram Basic Display API tokens (IGQV...) use: graph.instagram.com/me/media
  // - Facebook Business tokens (EAA...) need the Instagram Business Account ID first
  let mediaBaseId = 'me';
  let baseHost = 'graph.instagram.com';

  try {
    // Try graph.instagram.com/me first (works for Basic Display + some Business tokens)
    const testResp = await get(`https://graph.instagram.com/me?fields=id,username&access_token=${token}`);
    if (testResp.error) {
      console.log('graph.instagram.com/me failed:', JSON.stringify(testResp.error));
      // Try via Facebook Graph API to find Instagram Business Account
      const fbResp = await get(`https://graph.facebook.com/me?fields=id,name&access_token=${token}`);
      if (fbResp.error) {
        console.error('TOKEN ERROR (both APIs failed):', JSON.stringify(fbResp.error));
        return;
      }
      console.log('Facebook user:', fbResp.name || fbResp.id);
      // Get pages connected to this user
      const pages = await get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
      if (!pages.data || !pages.data.length) {
        console.error('No Facebook Pages found for this token');
        return;
      }
      // Find the page with an Instagram Business Account
      let igAccountId = null;
      for (const page of pages.data) {
        const pageResp = await get(`https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${token}`);
        if (pageResp.instagram_business_account) {
          igAccountId = pageResp.instagram_business_account.id;
          console.log('Found Instagram Business Account:', igAccountId, 'on page:', page.name);
          break;
        }
      }
      if (!igAccountId) {
        console.error('No Instagram Business Account found connected to Facebook Pages');
        return;
      }
      mediaBaseId = igAccountId;
      baseHost = 'graph.facebook.com';
      console.log('Using Facebook Graph API with IG account ID:', igAccountId);
    } else {
      console.log('Token OK (Instagram API) — account:', testResp.username || testResp.id);
    }
  } catch(e) {
    console.error('TOKEN TEST FAILED:', e.message);
    return;
  }

  // 1. Fetch all media from Instagram
  console.log("Fetching media...");
  let rawPosts = [];
  const mediaFields = 'id,media_type,media_url,thumbnail_url,caption,timestamp,like_count,comments_count';
  let url = `https://${baseHost}/${mediaBaseId}/media?fields=${mediaFields}&limit=100&access_token=${token}`;
  while (url) {
    const res = await get(url);
    if (!res.data) break;
    for (const item of res.data) {
      if (item.media_type === "CAROUSEL_ALBUM") {
        const children = await get(`https://${baseHost}/${item.id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`);
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
  // Build lookup maps — by item_id AND by Instagram ID embedded in Cloudinary URL
  // This handles both Basic Display tokens (one set of IDs) and Business tokens (different IDs)
  const existingByItemId = {};
  const existingByCloudinaryId = {}; // key = IG media ID extracted from Cloudinary URL
  existing.forEach(e => {
    if (e.item_id) existingByItemId[e.item_id] = e;
    if (e.u && e.u.includes('cloudinary')) {
      // Cloudinary URLs contain the IG media ID in the path, e.g. yarden_makeup_18094353658922515
      const m = e.u.match(/yarden_makeup_(\d+)/);
      if (m) existingByCloudinaryId[m[1]] = e;
    }
  });
  const igIdFromUrl = (url) => {
    if (!url) return null;
    const m = url.match(/\/(\d{15,})(?:\?|$|_)/);
    return m ? m[1] : null;
  };

  // 3. Upload new items to Cloudinary — deduplicate by item_id OR by IG ID in URL
  const gallery = [];
  const seenUrls = new Set();
  for (const item of rawPosts) {
    // Check by item_id first
    let existingEntry = existingByItemId[item.id];
    // Fallback: extract IG ID from the media URL and check Cloudinary
    if (!existingEntry) {
      const igId = igIdFromUrl(item.media_url || item.thumbnail_url || '');
      if (igId) existingEntry = existingByCloudinaryId[igId];
    }

    if (existingEntry && existingEntry.u && existingEntry.u.includes('cloudinary')) {
      if (!seenUrls.has(existingEntry.u)) {
        // Update item_id to new token's ID so future runs also match
        existingEntry.item_id = item.id;
        seenUrls.add(existingEntry.u);
        gallery.push(existingEntry);
      }
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
      // First try with full comment fields. If empty/error, log the response for debugging.
      let data = await get(`https://${baseHost}/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${token}`);
      let commentsArr = data.comments?.data || [];
      // If we got comments_count > 0 but no comments returned, the token lacks instagram_manage_comments permission.
      // Log once so the issue is visible in Action logs.
      if ((data.comments_count || 0) > 0 && commentsArr.length === 0 && !global._loggedCommentWarn) {
        console.log(`⚠️ Comments unavailable (token lacks permissions?). Sample response for ${id}:`, JSON.stringify(data).substring(0, 300));
        global._loggedCommentWarn = true;
      }
      stats[id] = {
        likes: data.like_count || 0,
        comments_count: data.comments_count || 0,
        comments: commentsArr.map(c => ({ username: c.username || "", text: c.text || "", timestamp: c.timestamp || "" })),
        permalink: data.permalink || ''
      };
      console.log(`  ${id}: ${stats[id].likes} likes, ${stats[id].comments_count} comments (${commentsArr.length} fetched)`);
    } catch(e) {
      stats[id] = { likes: 0, comments_count: 0, comments: [] };
    }
  }
  fs.writeFileSync("instagram-stats.json", JSON.stringify(stats, null, 2));
  console.log(`✅ Done. Saved stats for ${uniquePostIds.length} posts.`);
})();
