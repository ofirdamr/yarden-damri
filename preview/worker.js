/**
 * Yarden Damri Admin Worker
 * 
 * Endpoints:
 *   GET  /settings       → returns current gallery-settings.json (public, no auth)
 *   POST /settings       → updates settings (requires X-Admin-Password header)
 *
 * Secrets (set in Cloudflare dashboard → Settings → Variables):
 *   ADMIN_PASSWORD  - the admin password (any string)
 *   GH_TOKEN        - GitHub personal access token with repo:contents:write
 *
 * Static config:
 *   GH_REPO   = "ofirdamr/yarden-damri"
 *   GH_BRANCH = "main"
 *   GH_FILE   = "gallery-settings.json"
 */

const GH_REPO   = 'ofirdamr/yarden-damri';
const GH_BRANCH = 'main';
const GH_FILE   = 'gallery-settings.json';

// CORS - allow your domain only
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...securityHeaders(), ...extra }
  });
}

async function getSettings(env) {
  const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}?ref=${GH_BRANCH}`;
  const r = await fetch(apiUrl, {
    headers: {
      'Authorization': 'token ' + env.GH_TOKEN,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'yarden-damri-admin-worker'
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (r.status === 404) return { data: {}, sha: null };
  if (!r.ok) throw new Error('GitHub GET failed: ' + r.status);
  const meta = await r.json();
  const rawBytes = atob(meta.content.replace(/\s/g, ''));
  const content = decodeURIComponent(escape(rawBytes));
  return { data: JSON.parse(content), sha: meta.sha };
}

// When heroVideo changes, bake the correct src+poster directly into preview/index.html
// so ALL visitors (no localStorage) see the right video immediately on load.
async function patchIndexHtml(env, videoUrl) {
  const INDEX_FILE = 'preview/index.html';
  const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}?ref=${GH_BRANCH}`;
  const headers = {
    'Authorization': 'token ' + env.GH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'yarden-damri-admin-worker'
  };
  const r = await fetch(apiUrl, { headers, cf: { cacheTtl: 0, cacheEverything: false } });
  if (!r.ok) throw new Error('index.html GET failed: ' + r.status);
  const meta = await r.json();
  let html = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ''))));

  // Build clean Cloudinary URLs
  const clean = videoUrl.replace(/\/video\/upload\/[^/]+\//, '/video/upload/');
  const src    = clean.replace('/video/upload/', '/video/upload/w_720,q_auto:good,f_auto/');
  const poster = clean.replace('/video/upload/', '/video/upload/so_0,w_720,f_jpg,q_auto/')
                      .replace(/\.(mp4|mov|webm)$/i, '.jpg');

  // Replace the <source> src inside heroVideoSource
  html = html.replace(
    /(<source id="heroVideoSource" src=")[^"]*(")/,
    `$1${src}$2`
  );
  // Replace the poster attribute on heroVideo
  html = html.replace(
    /(<video id="heroVideo"[^>]*poster=")[^"]*(")/,
    `$1${poster}$2`
  );

  const putBody = {
    message: 'admin: bake hero video into index.html',
    content: btoa(unescape(encodeURIComponent(html))),
    branch: GH_BRANCH,
    sha: meta.sha
  };
  const pr = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${INDEX_FILE}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody)
  });
  if (!pr.ok) {
    const text = await pr.text().catch(() => '');
    throw new Error('index.html PUT failed: ' + pr.status + ': ' + text.slice(0, 200));
  }
}

async function putSettings(env, data, currentSha) {
  data.updatedAt = new Date().toISOString();
  const body = {
    message: 'admin: update gallery settings',
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: GH_BRANCH
  };
  if (currentSha) body.sha = currentSha;

  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + env.GH_TOKEN,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'yarden-damri-admin-worker'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error('GitHub PUT failed: ' + r.status + ': ' + text.slice(0, 200));
  }
  const d = await r.json();
  return d.content.sha;
}

function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])
        && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      out[k] = deepMerge(target[k], source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // GET /settings — public read
      if (request.method === 'GET' && path === '/settings') {
        const { data } = await getSettings(env);
        return json(data);
      }

      // POST /settings — admin write
      if (request.method === 'POST' && path === '/settings') {
        const pwd = request.headers.get('X-Admin-Password');
        if (!pwd || pwd !== env.ADMIN_PASSWORD) {
          return json({ error: 'unauthorized' }, 401);
        }
        const body = await request.json();
        if (!body || typeof body !== 'object') {
          return json({ error: 'bad_body' }, 400);
        }
        // Merge with current settings (atomic at GitHub level via SHA)
        let attempt = 0;
        while (attempt < 3) {
          try {
            const { data: current, sha } = await getSettings(env);
            const merged = deepMerge(current, body);
            await putSettings(env, merged, sha);
            // If heroVideo changed, bake it into preview/index.html for zero-flash load for all visitors
            if (body.heroVideo) {
              await patchIndexHtml(env, body.heroVideo).catch(e => console.error('patchIndexHtml failed:', e.message));
            }
            return json({ ok: true });
          } catch (e) {
            if (e.message.includes('409') || e.message.includes('sha')) {
              attempt++;
              continue;
            }
            throw e;
          }
        }
        return json({ error: 'conflict_retries_exhausted' }, 500);
      }

      // Health check
      if (request.method === 'GET' && path === '/') {
        return json({ ok: true, service: 'yarden-damri-admin' });
      }

      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: e.message || 'internal' }, 500);
    }
  }
};
