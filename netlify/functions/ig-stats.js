/**
 * netlify/functions/ig-stats.js
 * מחזיר לייקים ותגובות מאינסטגרם עבור רשימת media IDs
 * קריאה: POST עם body: { ids: ["123","456",...] }
 */

const https = require("https");

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = ""; r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res({}); } });
    }).on("error", () => res({}));
  });
}

exports.handler = async (event) => {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return { statusCode: 500, body: "No token" };
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  let ids = [];
  try { ids = JSON.parse(event.body).ids || []; } catch(e) {}
  if (!ids.length) return { statusCode: 400, body: "No IDs" };

  // Instagram Graph API מאפשר batch של עד 50
  const results = {};
  const batches = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));

  for (const batch of batches) {
    // batch request
    const batchParam = batch.map(id =>
      `{"method":"GET","relative_url":"${id}?fields=like_count,comments_count,comments{text,timestamp,username}"}`
    ).join(",");
    const url = `https://graph.instagram.com/v19.0/?batch=[${encodeURIComponent(batchParam)}]&access_token=${token}&include_headers=false`;

    // batch POST
    const data = await new Promise((res, rej) => {
      const body = `batch=${encodeURIComponent(JSON.stringify(batch.map(id => ({
        method: "GET",
        relative_url: `${id}?fields=like_count,comments_count,comments{text,timestamp,username}`
      }))))}`;
      const req = https.request({
        hostname: "graph.instagram.com",
        path: "/v19.0/",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(`batch=${encodeURIComponent(JSON.stringify(batch.map(id => ({ method: "GET", relative_url: `${id}?fields=like_count,comments_count,comments{text,timestamp,username}` }))))}`) }
      }, r => {
        let d = ""; r.on("data", c => d += c);
        r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { res([]); } });
      });
      req.on("error", () => res([]));
      const b = `batch=${encodeURIComponent(JSON.stringify(batch.map(id => ({ method: "GET", relative_url: `${id}?fields=like_count,comments_count,comments{text,timestamp,username}` }))))}&access_token=${token}&include_headers=false`;
      req.write(b); req.end();
    });

    // פרסינג התוצאות
    if (Array.isArray(data)) {
      data.forEach((item, i) => {
        try {
          const body = JSON.parse(item.body);
          results[batch[i]] = {
            likes: body.like_count || 0,
            comments: (body.comments?.data || []).map(c => ({
              user: c.username || "משתמש",
              text: c.text,
              date: c.timestamp
            }))
          };
        } catch(e) {
          results[batch[i]] = { likes: 0, comments: [] };
        }
      });
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=1800" },
    body: JSON.stringify(results)
  };
};
