/*
 * worker-temp.js — Yarden Damri Admin Worker (Security Refactor)
 *
 * BREAKING CHANGES vs worker.js:
 *   - Raw password header (X-Admin-Password) removed from all endpoints
 *   - POST /settings now requires Authorization: Bearer <token>
 *   - New POST /login endpoint issues session tokens (stored in KV)
 *   - New POST /logout endpoint invalidates a session token
 *   - Rate limiting on /login: 5 failures → 15-min IP lockout (KV)
 *
 * REQUIRED KV BINDING (add to wrangler.toml):
 *   [[kv_namespaces]]
 *   binding = "SESSIONS"
 *   id = "<your-kv-namespace-id>"
 *
 * REQUIRED SECRETS (already present):
 *   ADMIN_PASSWORD   – plaintext admin password
 *   GH_TOKEN         – GitHub API token
 */

const GH_REPO     = 'ofirdamr/yarden-damri';
const GH_BRANCH   = 'main';
const GH_FILE     = 'gallery-settings.json';
const SOCIAL_FILE = 'social.json';

const SESSION_TTL  = 28800; // 8 hours (seconds)
const RL_WINDOW    = 900;   // 15 minutes (seconds)
const RL_MAX       = 5;     // max failures before lockout

const ALLOWED_ORIGINS = [
  'https://yardendamri.co.il',
  'https://www.yardendamri.co.il',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

// ── Security & CORS headers ─────────────────────────────────────

function securityHeaders() {
  return {
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '0',
    'Content-Security-Policy': "default-src 'none'",
  };
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, extra = {}, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...securityHeaders(),
      ...extra,
    },
  });
}

// ── Rate limiting ───────────────────────────────────────────────

async function checkRateLimit(env, ip) {
  if (!env.SESSIONS) return { limited: false, attempts: 0 };
  const raw = await env.SESSIONS.get('rl:' + ip, { type: 'json' });
  if (!raw) return { limited: false, attempts: 0 };
  if (raw.lockedUntil && Date.now() < raw.lockedUntil) {
    return { limited: true, retryAfter: Math.ceil((raw.lockedUntil - Date.now()) / 1000) };
  }
  return { limited: false, attempts: raw.attempts || 0 };
}

async function recordFailedAttempt(env, ip) {
  if (!env.SESSIONS) return;
  const raw = await env.SESSIONS.get('rl:' + ip, { type: 'json' }) || { attempts: 0 };
  const attempts = (raw.attempts || 0) + 1;
  const data = attempts >= RL_MAX
    ? { attempts, lockedUntil: Date.now() + RL_WINDOW * 1000 }
    : { attempts };
  await env.SESSIONS.put('rl:' + ip, JSON.stringify(data), { expirationTtl: RL_WINDOW });
}

async function clearRateLimit(env, ip) {
  if (!env.SESSIONS) return;
  await env.SESSIONS.delete('rl:' + ip);
}

// ── Session management ──────────────────────────────────────────

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createSession(env, ip) {
  const token = generateToken();
  if (env.SESSIONS) {
    await env.SESSIONS.put(
      'session:' + token,
      JSON.stringify({ created: Date.now(), ip }),
      { expirationTtl: SESSION_TTL }
    );
  }
  return token;
}

async function validateSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  if (!env.SESSIONS) return false;
  const session = await env.SESSIONS.get('session:' + token);
  return session !== null;
}

async function deleteSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return;
  const token = auth.slice(7).trim();
  if (/^[0-9a-f]{64}$/.test(token) && env.SESSIONS) {
    await env.SESSIONS.delete('session:' + token);
  }
}

// ── GitHub helpers ──────────────────────────────────────────────

async function ghGet(env, file) {
  const r = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${file}?ref=${GH_BRANCH}`,
    {
      headers: {
        Authorization: 'token ' + env.GH_TOKEN,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'yarden-damri-worker',
      },
      cf: { cacheTtl: 0, cacheEverything: false },
    }
  );
  if (r.status === 404) return { data: {}, sha: null };
  if (!r.ok) throw new Error('GitHub GET failed: ' + r.status);
  const meta = await r.json();
  const content = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ''))));
  return { data: JSON.parse(content), sha: meta.sha };
}

async function ghPut(env, file, data, sha, message) {
  data.updatedAt = new Date().toISOString();
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`, {
    method: 'PUT',
    headers: {
      Authorization: 'token ' + env.GH_TOKEN,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'yarden-damri-worker',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('GitHub PUT failed: ' + r.status + ': ' + t.slice(0, 200));
  }
  const d = await r.json();
  return d.content.sha;
}

async function patchIndexHtml(env, videoUrl) {
  const INDEX_FILE = 'preview/index.html';
  const headers = {
    Authorization: 'token ' + env.GH_TOKEN,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'yarden-damri-worker',
  };
  const r = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}?ref=${GH_BRANCH}`,
    { headers, cf: { cacheTtl: 0, cacheEverything: false } }
  );
  if (!r.ok) throw new Error('index.html GET failed: ' + r.status);
  const meta = await r.json();
  let html = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ''))));
  html = html.replace(
    /(<source id="heroVideoSource" src=")[^"]*(")/,
    `$1${videoUrl}$2`
  );
  html = html.replace(/(<video id="heroVideo"[^>]*?)(\s+src="[^"]*")/, `$1`);
  const putBody = {
    message: 'admin: bake hero video into index.html',
    content: btoa(unescape(encodeURIComponent(html))),
    branch: GH_BRANCH,
    sha: meta.sha,
  };
  const pr = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });
  if (!pr.ok) {
    const t = await pr.text().catch(() => '');
    throw new Error('index.html PUT failed: ' + pr.status + ': ' + t.slice(0, 200));
  }
}

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const k of Object.keys(source)) {
    if (
      source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) &&
      target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])
    ) {
      out[k] = deepMerge(target[k], source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

// ── Request handler ─────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {

      // ── GET / ──
      if (request.method === 'GET' && path === '/') {
        return json({ ok: true, service: 'yarden-damri-admin' }, 200, {}, origin);
      }

      // ── POST /login — authenticate and issue session token ──
      if (request.method === 'POST' && path === '/login') {
        const ip = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   'unknown';

        const rl = await checkRateLimit(env, ip);
        if (rl.limited) {
          return json(
            { error: 'too_many_attempts', retryAfter: rl.retryAfter },
            429,
            { 'Retry-After': String(rl.retryAfter) },
            origin
          );
        }

        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }

        const { password } = body || {};
        if (!password || password !== env.ADMIN_PASSWORD) {
          await recordFailedAttempt(env, ip);
          return json({ error: 'unauthorized' }, 401, {}, origin);
        }

        await clearRateLimit(env, ip);
        const token = await createSession(env, ip);
        return json({ token, expiresIn: SESSION_TTL }, 200, {}, origin);
      }

      // ── POST /logout — invalidate session token ──
      if (request.method === 'POST' && path === '/logout') {
        await deleteSession(request, env);
        return json({ ok: true }, 200, {}, origin);
      }

      // ── GET /settings — public read ──
      if (request.method === 'GET' && path === '/settings') {
        const { data } = await ghGet(env, GH_FILE);
        return json(data, 200, {}, origin);
      }

      // ── POST /settings — admin write (requires session token) ──
      if (request.method === 'POST' && path === '/settings') {
        const valid = await validateSession(request, env);
        if (!valid) return json({ error: 'unauthorized' }, 401, {}, origin);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, {}, origin);

        let attempt = 0;
        while (attempt < 3) {
          try {
            const { data: current, sha } = await ghGet(env, GH_FILE);
            const merged = deepMerge(current, body);
            await ghPut(env, GH_FILE, merged, sha, 'admin: update gallery settings');
            if (body.heroVideo) {
              await patchIndexHtml(env, body.heroVideo).catch(
                e => console.error('patchIndexHtml failed:', e.message)
              );
            }
            return json({ ok: true }, 200, {}, origin);
          } catch (e) {
            if (e.message.includes('409') || e.message.includes('sha')) { attempt++; continue; }
            throw e;
          }
        }
        return json({ error: 'conflict_retries_exhausted' }, 500, {}, origin);
      }

      // ── GET /social — public read likes+comments ──
      if (request.method === 'GET' && path === '/social') {
        const { data } = await ghGet(env, SOCIAL_FILE);
        return json(data, 200, {}, origin);
      }

      // ── POST /social — public write likes+comments (no auth required) ──
      if (request.method === 'POST' && path === '/social') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, {}, origin);

        const allowed = {};
        if (body.likes    && typeof body.likes    === 'object') allowed.likes    = body.likes;
        if (body.comments && typeof body.comments === 'object') allowed.comments = body.comments;
        if (Object.keys(allowed).length === 0) return json({ error: 'nothing_to_save' }, 400, {}, origin);

        let attempt = 0;
        while (attempt < 3) {
          try {
            const { data: current, sha } = await ghGet(env, SOCIAL_FILE);
            const merged = {
              likes:    { ...(current.likes    || {}) },
              comments: { ...(current.comments || {}) },
            };
            if (allowed.likes) {
              for (const [k, v] of Object.entries(allowed.likes)) {
                merged.likes[k] = Math.max(merged.likes[k] || 0, v);
              }
            }
            if (allowed.comments) {
              for (const [k, v] of Object.entries(allowed.comments)) {
                if (Array.isArray(v)) merged.comments[k] = v;
              }
            }
            await ghPut(env, SOCIAL_FILE, merged, sha, 'social: update likes/comments');
            return json({ ok: true }, 200, {}, origin);
          } catch (e) {
            if (e.message.includes('409') || e.message.includes('sha')) { attempt++; continue; }
            throw e;
          }
        }
        return json({ error: 'conflict_retries_exhausted' }, 500, {}, origin);
      }

      // ── GET /s/... — clean share page: OG card (thumbnail + title) that
      //    redirects to the exact item in the gallery. Forms:
      //    /s/v/<id> (video), /s/p/<id> (photo), /s/<id>, or /s?id=&t=v ──
      if (request.method === 'GET' && (path === '/s' || path.startsWith('/s/'))) {
        let id = url.searchParams.get('id') || '';
        let kind = url.searchParams.get('t') || '';
        const parts = path.split('/').filter(Boolean); // e.g. ['s','v','123']
        if (parts.length === 3) { kind = parts[1]; id = parts[2]; }
        else if (parts.length === 2) { id = parts[1]; }
        id = (id || '').replace(/[^0-9]/g, '');
        const temp = url.searchParams.get('g') === 't';
        const galleryFile = temp ? 'gallery-temp.html' : 'gallery.html';
        if (!id) return Response.redirect(`https://yardendamri.co.il/preview/${galleryFile}`, 302);
        const isVid = kind === 'v';
        const ogImage = isVid
          ? `https://images.yardendamri.co.il/yarden_${id}_thumb.jpg`
          : `https://images.yardendamri.co.il/yarden_${id}.webp`;
        const target = `https://yardendamri.co.il/preview/${galleryFile}?m=${id}`;
        const title = isVid ? 'לחצי כאן לצפייה בסרטון המלא 👆' : 'לחצי כאן לצפייה בתמונה המלאה 👆';
        const desc = 'ירדן דמרי — מאפרת כלות וערב באילת';
        const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const htmlBody = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(desc)}</title>
<meta property="og:type" content="${isVid ? 'video.other' : 'article'}">
<meta property="og:site_name" content="ירדן דמרי">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${esc(target)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<style>body{margin:0;background:#fdf8f5;font-family:Heebo,Arial,sans-serif;color:#7A4A34;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}a{color:#B07060;font-weight:600}</style>
</head><body><div><p>מעבירה אותך לגלריה…</p><p><a href="${esc(target)}">להמשך לחצי כאן</a></p>
<script>location.replace(${JSON.stringify(target)});</script></div></body></html>`;
        return new Response(htmlBody, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
      }

      // ── POST /copywriter — AI copy suggestions (Gemini, requires session token) ──
      if (request.method === 'POST' && path === '/copywriter') {
        const valid = await validateSession(request, env);
        if (!valid) return json({ error: 'unauthorized' }, 401, {}, origin);
        if (!env.GEMINI_API_KEY) return json({ error: 'ai_not_configured' }, 503, {}, origin);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }
        const label   = String((body && body.label)   || 'טקסט באתר').slice(0, 200);
        const current = String((body && body.current) || '').slice(0, 4000);
        const prompt  = String((body && body.prompt)  || '').slice(0, 1000);

        // Field-aware: SEO-specialist brain on the title/description fields, copywriter brain elsewhere.
        const page = String(key).split('.')[0];
        const isSEO = /\.meta\.(title|description)$/.test(key);
        const isTitle = /\.meta\.title$/.test(key);
        const noEilat = ['home', 'bride', 'guide'].includes(page); // bridal / nationwide search intent
        let system, userMsg;
        if (isSEO) {
          const lenRule = isTitle
            ? 'כותרת דף (title): עד כ-60 תווים. מילת המפתח החשובה בהתחלה, וכללי את השם "ירדן דמרי".'
            : 'תיאור מטא (description): כ-150 תווים. משפט שיווקי שמושך הקלקה, עם מילת מפתח וקריאה עדינה לפעולה.';
          const intent = noEilat
            ? 'דף זה הוא בכוונת חיפוש של כלות מכל הארץ. הדגישי "מאפרת כלות" ו"איפור כלות" יחד עם "מגיעה לכל הארץ" / "עד אלייך". ' +
              'אל תזכירי "אילת" — הכלות מגיעות מכל הארץ, ואזכור אילת עלול להרתיע אותן.'
            : 'דף זה יכול לתפוס גם חיפושים מקומיים — מותר וכדאי לכלול "אילת" / "מאפרת באילת" לצד מילות המפתח הכלליות.';
          system =
            'את מומחית SEO וקופירייטרית בעברית עבור ירדן דמרי, מאפרת כלות וערב יוקרתית. ' +
            'תפקידך לנסח שדה SEO שידורג גבוה בגוגל ויקבל הרבה הקלקות. ' +
            'שלבי מילות מפתח שמחפשים בפועל: "מאפרת כלות", "איפור כלות", "מאפרת", "איפור ערב". ' +
            lenRule + ' ' + intent + ' ' +
            'כתבי עברית טבעית וזורמת — לא רשימת מילים. אל תוסיפי מרכאות או סימוני עיצוב. ' +
            'החזירי אך ורק JSON תקין: {"suggestions":["נוסח 1","נוסח 2","נוסח 3"]}.';
          userMsg =
            'שדה SEO: ' + label + '\nהטקסט הנוכחי:\n"""' + (current || '(ריק)') + '"""\n\n' +
            (prompt ? ('בקשה נוספת מהמנהלת: ' + prompt + '\n\n') : '') +
            'הציעי 3 ניסוחים חלופיים ממוקדי-SEO.';
        } else {
          system =
            'את קופירייטרית מקצועית שכותבת בעברית טבעית, חמה ומדויקת עבור מותג יוקרה של מאפרת כלות וערב. ' +
            'המאפרת ממוקמת באילת ומגיעה לכלות בכל רחבי הארץ. הטון: נשי, אלגנטי, אישי ומזמין — לא מתורגם, לא מליצי מדי, ' +
            'נטול קלישאות שיווקיות זולות. כתבי בעברית תקנית. שמרי על אורך דומה לטקסט המקורי ועל אותו תפקיד ' +
            '(כותרת קצרה / תת-כותרת / פסקה / כפתור). אל תוסיפי מרכאות, כוכביות או סימוני עיצוב. ' +
            'החזירי אך ורק JSON תקין בפורמט: {"suggestions":["נוסח 1","נוסח 2","נוסח 3"]}.';
          userMsg =
            'שדה: ' + label + '\n' +
            'הטקסט הנוכחי:\n"""' + (current || '(ריק)') + '"""\n\n' +
            (prompt ? ('בקשת הסגנון של המנהלת: ' + prompt + '\n\n') : '') +
            'הציעי 3 ניסוחים חלופיים מצוינים לשדה הזה.';
        }

        const gURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
        const gRes = await fetch(gURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            // thinkingBudget:0 disables 2.5-flash "thinking" → no truncated/cut-off JSON.
            generationConfig: { temperature: 0.9, maxOutputTokens: 2048, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
          }),
        });
        if (!gRes.ok) {
          const detail = await gRes.text().catch(() => '');
          return json({ error: 'upstream_' + gRes.status, detail: detail.slice(0, 200) }, 502, {}, origin);
        }
        const gData = await gRes.json();
        const text = (((gData.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '';
        let suggestions = [];
        try { const m = text.match(/\{[\s\S]*\}/); if (m) suggestions = JSON.parse(m[0]).suggestions || []; } catch {}
        if (!suggestions.length) {
          suggestions = text.split(/\n{2,}/).map(s => s.replace(/^["'\d.\-)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
        }
        return json({ ok: true, suggestions }, 200, {}, origin);
      }

      // ── POST /transcribe — speech-to-text via Gemini (requires session token) ──
      if (request.method === 'POST' && path === '/transcribe') {
        const valid = await validateSession(request, env);
        if (!valid) return json({ error: 'unauthorized' }, 401, {}, origin);
        if (!env.GEMINI_API_KEY) return json({ error: 'ai_not_configured' }, 503, {}, origin);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }
        const audio = (body && body.audio) || '';
        const mime  = (body && body.mime)  || 'audio/wav';
        if (!audio) return json({ error: 'no_audio' }, 400, {}, origin);

        const instruction =
          'תמללי את ההקלטה לעברית בצורה מדויקת וטבעית. תקני שגיאות זיהוי דיבור, הוסיפי סימני פיסוק נכונים, ' +
          'והתאימי את הטקסט להקשר. החזירי אך ורק את הטקסט המתומלל — בלי הסברים, בלי מרכאות, בלי הקדמות.';
        const gURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
        const gRes = await fetch(gURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { inline_data: { mime_type: mime, data: audio } },
              { text: instruction },
            ] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
          }),
        });
        if (!gRes.ok) {
          const detail = await gRes.text().catch(() => '');
          return json({ error: 'upstream_' + gRes.status, detail: detail.slice(0, 200) }, 502, {}, origin);
        }
        const gData = await gRes.json();
        const text = (((gData.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '';
        return json({ ok: true, text: text.trim() }, 200, {}, origin);
      }

      return json({ error: 'not_found' }, 404, {}, origin);

    } catch (e) {
      return json({ error: e.message || 'internal' }, 500, {}, origin);
    }
  },
};
