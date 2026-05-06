/**
 * webhook-server/index.js
 * שרת Express חינמי על Render.com
 * מקבל webhooks ממטא → מעלה לCloudinary → מעדכן gallery-data.js ב-GitHub → מפעיל Netlify rebuild
 * 
 * ENV VARS ב-Render:
 *   INSTAGRAM_TOKEN        - טוקן Instagram Graph
 *   WEBHOOK_VERIFY_TOKEN   - מחרוזת שרירותית שתבחרי (לדוגמה: yarden_secret_123)
 *   CLOUDINARY_CLOUD       - dfjwxc1cw
 *   CLOUDINARY_API_KEY     - 918422887842789
 *   CLOUDINARY_API_SECRET  - BbPBPuX5u0QqOqFTOOiiA9SvWMk
 *   GITHUB_TOKEN           - Personal Access Token (scope: repo)
 *   GITHUB_REPO            - username/repo-name
 *   NETLIFY_BUILD_HOOK     - URL מ-Netlify Build Hooks
 */

const express = require("express");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use((_, res, next) => { res.set("Access-Control-Allow-Origin", "*"); res.set("Access-Control-Allow-Headers", "Content-Type"); next(); });
app.options("*", (_, res) => res.sendStatus(200));

const {
  INSTAGRAM_TOKEN, WEBHOOK_VERIFY_TOKEN,
  CLOUDINARY_CLOUD, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
  GITHUB_TOKEN, GITHUB_REPO, NETLIFY_BUILD_HOOK
} = process.env;

// ── helpers ──────────────────────────────────

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = ""; r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res(d); } });
    }).on("error", rej);
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((res, rej) => {
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr), ...headers }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res(d); } }); });
    req.on("error", rej); req.write(bodyStr); req.end();
  });
}

function uploadToCloudinary(imageUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "yarden_makeup";
  const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");
  const formData = [
    `file=${encodeURIComponent(imageUrl)}`,
    `folder=${folder}`, `public_id=${publicId}`,
    `timestamp=${timestamp}`, `api_key=${CLOUDINARY_API_KEY}`, `signature=${signature}`
  ].join("&");

  return new Promise((res, rej) => {
    const req = https.request({
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(formData) }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } }); });
    req.on("error", rej); req.write(formData); req.end();
  });
}

function ghGet(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: "api.github.com", path,
      headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "webhook-server" }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } }); }).on("error", rej);
  });
}

function ghPut(path, body) {
  const bodyStr = JSON.stringify(body);
  return new Promise((res, rej) => {
    const req = https.request({
      hostname: "api.github.com", path, method: "PUT",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "webhook-server", "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) }
    }, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d))); });
    req.on("error", rej); req.write(bodyStr); req.end();
  });
}

async function addToGallery(secureUrl, caption) {
  const file = await ghGet(`/repos/${GITHUB_REPO}/contents/gallery-data.js`);
  const current = Buffer.from(file.content, "base64").toString("utf-8");
  const jsonStr = current.replace(/^\/\/ Auto-generated gallery data\n/, "").replace(/^const GALLERY_IMAGES = /, "").replace(/;?\s*$/, "");
  const arr = JSON.parse(jsonStr);
  arr.unshift({ u: secureUrl, a: (caption || "").substring(0, 200) });
  const newContent = `// Auto-generated gallery data\nconst GALLERY_IMAGES = ${JSON.stringify(arr)};`;
  await ghPut(`/repos/${GITHUB_REPO}/contents/gallery-data.js`, {
    message: "🤖 Auto-sync: new Instagram post",
    content: Buffer.from(newContent).toString("base64"),
    sha: file.sha
  });
  if (NETLIFY_BUILD_HOOK) await httpPost(NETLIFY_BUILD_HOOK, "{}");
  console.log("✅ Gallery updated + rebuild triggered");
}

// ── Routes ───────────────────────────────────

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Meta webhook events
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // מענה מיידי למטא
  try {
    const body = req.body;
    if (body.object !== "instagram") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "media") continue;
        const mediaId = change.value?.media_id;
        if (!mediaId) continue;

        console.log(`📸 New Instagram media: ${mediaId}`);

        // שלוף פרטי התמונה
        const media = await get(
          `https://graph.instagram.com/${mediaId}?fields=id,media_type,media_url,caption&access_token=${INSTAGRAM_TOKEN}`
        );
        if (!media.media_url || !["IMAGE","CAROUSEL_ALBUM"].includes(media.media_type)) continue;

        // העלה לCloudinary
        const publicId = `yarden_makeup_${media.id}`;
        console.log(`⬆️ Uploading ${publicId}...`);
        const uploaded = await uploadToCloudinary(media.media_url, publicId);
        if (!uploaded.secure_url) { console.error("Upload failed:", uploaded.error); continue; }

        // עדכן גלריה
        await addToGallery(uploaded.secure_url, media.caption);
      }
    }
  } catch (e) {
    console.error("❌ Webhook error:", e.message);
  }
});

// Health check
app.get("/", (_, res) => res.send("✅ Yarden webhook server running"));

// Instagram feed — תמונות אחרונות
app.get("/instagram-feed", async (_, res) => {
  try {
    const data = await get(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,timestamp&limit=12&access_token=${INSTAGRAM_TOKEN}`);
    const posts = (data.data || []).filter(p => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM").map(p => ({ u: p.media_url, a: p.caption || "", id: p.id }));
    res.set("Cache-Control", "s-maxage=3600").json(posts);
  } catch(e) { res.status(500).json([]); }
});

// ig-stats — לייקים ותגובות
app.post("/ig-stats", async (req, res) => {
  const ids = req.body?.ids || [];
  if (!ids.length) return res.status(400).json({});
  const results = {};
  for (const id of ids.slice(0, 50)) {
    try {
      const data = await get(`https://graph.instagram.com/${id}?fields=like_count,comments_count,comments{text,timestamp,username}&access_token=${INSTAGRAM_TOKEN}`);
      results[id] = { likes: data.like_count || 0, comments: (data.comments?.data || []).map(c => ({ user: c.username || "משתמש", text: c.text, date: c.timestamp })) };
    } catch(e) { results[id] = { likes: 0, comments: [] }; }
  }
  res.set("Cache-Control", "s-maxage=1800").json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
