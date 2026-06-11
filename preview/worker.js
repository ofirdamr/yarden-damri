const GH_REPO   = 'ofirdamr/yarden-damri';
const GH_BRANCH = 'main';
const GH_FILE   = 'gallery-settings.json';
const SOCIAL_FILE = 'social.json';
const CORS_ORIGIN = 'https://yardendamri.co.il';

function securityHeaders() {
  return {
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '1; mode=block'
  };
}

function corsHeaders(origin) {
  const allowed = [
    'https://yardendamri.co.il',
    'https://www.yardendamri.co.il',
    'https://ofirdamr.github.io'
  ];
  const o = allowed.includes(origin) ? origin : CORS_ORIGIN;
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status = 200, extra = {}, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin), ...securityHeaders(), ...extra }
  });
}

async function ghGet(env, file) {
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}?ref=${GH_BRANCH}`, {
    headers: { 'Authorization': 'token ' + env.GH_TOKEN, 'Accept': 'application/vnd.github+json', 'User-Agent': 'yarden-damri-worker' },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (r.status === 404) return { data: {}, sha: null };
  if (!r.ok) throw new Error('GitHub GET failed: ' + r.status);
  const meta = await r.json();
  const content = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ''))));
  return { data: JSON.parse(content), sha: meta.sha };
}

async function ghPut(env, file, data, sha, message) {
  data.updatedAt = new Date().toISOString();
  const body = { message, content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))), branch: GH_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${file}`, {
    method: 'PUT',
    headers: { 'Authorization': 'token ' + env.GH_TOKEN, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'yarden-damri-worker' },
    body: JSON.stringify(body)
  });
  if (!r.ok) { const t = await r.text().catch(()=>''); throw new Error('GitHub PUT failed: ' + r.status + ': ' + t.slice(0,200)); }
  const d = await r.json();
  return d.content.sha;
}

async function patchIndexHtml(env, videoUrl) {
  const INDEX_FILE = 'preview/index.html';
  const headers = { 'Authorization': 'token ' + env.GH_TOKEN, 'Accept': 'application/vnd.github+json', 'User-Agent': 'yarden-damri-worker' };
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}?ref=${GH_BRANCH}`, { headers, cf: { cacheTtl: 0, cacheEverything: false } });
  if (!r.ok) throw new Error('index.html GET failed: ' + r.status);
  const meta = await r.json();
  let html = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ''))));
  html = html.replace(/(<source id="heroVideoSource" src=")[^"]*(")/,`$1${videoUrl}$2`);
  html = html.replace(/(<video id="heroVideo"[^>]*?)(\s+src="[^"]*")/,`$1`);
  const putBody = { message: 'admin: bake hero video into index.html', content: btoa(unescape(encodeURIComponent(html))), branch: GH_BRANCH, sha: meta.sha };
  const pr = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}`, {
    method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(putBody)
  });
  if (!pr.ok) { const t = await pr.text().catch(()=>''); throw new Error('index.html PUT failed: ' + pr.status + ': ' + t.slice(0,200)); }
}

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])
        && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      out[k] = deepMerge(target[k], source[k]);
    } else { out[k] = source[k]; }
  }
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // ── GET /settings — public read ──
      if (request.method === 'GET' && path === '/settings') {
        const { data } = await ghGet(env, GH_FILE);
        return json(data, 200, {}, origin);
      }

      // ── POST /settings — admin write ──
      if (request.method === 'POST' && path === '/settings') {
        const pwd = request.headers.get('X-Admin-Password');
        if (!pwd || pwd !== env.ADMIN_PASSWORD) return json({ error: 'unauthorized' }, 401, {}, origin);
        const body = await request.json();
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, {}, origin);
        let attempt = 0;
        while (attempt < 3) {
          try {
            const { data: current, sha } = await ghGet(env, GH_FILE);
            const merged = deepMerge(current, body);
            await ghPut(env, GH_FILE, merged, sha, 'admin: update gallery settings');
            if (body.heroVideo) {
              await patchIndexHtml(env, body.heroVideo).catch(e => console.error('patchIndexHtml failed:', e.message));
            }
            return json({ ok: true }, 200, {}, origin);
          } catch(e) {
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

      // ── POST /social — public write likes+comments (no password) ──
      if (request.method === 'POST' && path === '/social') {
        const body = await request.json();
        if (!body || typeof body !== 'object') return json({ error: 'bad_body' }, 400, {}, origin);
        // Only allow likes and comments keys — no other data
        const allowed = {};
        if (body.likes && typeof body.likes === 'object') allowed.likes = body.likes;
        if (body.comments && typeof body.comments === 'object') allowed.comments = body.comments;
        if (Object.keys(allowed).length === 0) return json({ error: 'nothing_to_save' }, 400, {}, origin);
        let attempt = 0;
        while (attempt < 3) {
          try {
            const { data: current, sha } = await ghGet(env, SOCIAL_FILE);
            // Merge likes (max values win to prevent decrement attacks)
            const merged = { likes: { ...(current.likes||{}) }, comments: { ...(current.comments||{}) } };
            if (allowed.likes) {
              for (const [k,v] of Object.entries(allowed.likes)) {
                merged.likes[k] = Math.max(merged.likes[k]||0, v);
              }
            }
            if (allowed.comments) {
              for (const [k,v] of Object.entries(allowed.comments)) {
                if (Array.isArray(v)) merged.comments[k] = v;
              }
            }
            await ghPut(env, SOCIAL_FILE, merged, sha, 'social: update likes/comments');
            return json({ ok: true }, 200, {}, origin);
          } catch(e) {
            if (e.message.includes('409') || e.message.includes('sha')) { attempt++; continue; }
            throw e;
          }
        }
        return json({ error: 'conflict_retries_exhausted' }, 500, {}, origin);
      }

      if (request.method === 'GET' && path === '/') return json({ ok: true, service: 'yarden-damri-admin' }, 200, {}, origin);
      return json({ error: 'not_found' }, 404, {}, origin);

    } catch(e) {
      return json({ error: e.message || 'internal' }, 500, {}, origin);
    }
  }
};
