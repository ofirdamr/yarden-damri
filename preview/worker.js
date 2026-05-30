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
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...extra }
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
