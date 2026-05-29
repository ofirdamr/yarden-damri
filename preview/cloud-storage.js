/* cloud-storage.js — reliable storage via GitHub
 *
 * Saves admin settings to gallery-settings.json in the repo via GitHub API.
 * GitHub Pages serves the file → public pages read it directly (no auth needed).
 * No size limits. No compression. Real commit = real save.
 *
 * TOKEN STORAGE:
 * The GitHub token is stored in localStorage on the manager's device only.
 * First-time admin use will prompt for it. Get one from:
 *   https://github.com/settings/tokens/new?scopes=repo&description=yarden-damri-admin
 * (or use a fine-grained PAT scoped to ofirdamr/yarden-damri with Contents:write)
 * Never committed to the repo.
 */
(function(window){
  const REPO   = 'ofirdamr/yarden-damri';
  const FILE   = 'gallery-settings.json';
  const BRANCH = 'main';
  const PUBLIC_URL = `https://yardendamri.co.il/${FILE}`;
  const API_URL    = `https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`;
  const CACHE_KEY  = 'cloud_state_v1';
  const TOKEN_KEY  = 'yd_gh_token';

  function getToken(){ try { return localStorage.getItem(TOKEN_KEY) || null; } catch(e){ return null; } }
  function setToken(t){ try { localStorage.setItem(TOKEN_KEY, t); } catch(e){} }

  // ── In-memory + localStorage cache ───────────────────────────
  let _cache = null;
  let _sha   = null; // current GitHub blob SHA for safe updates
  let _ready = false;
  let _readyResolve;
  const _readyPromise = new Promise(r => _readyResolve = r);

  function loadCache(){
    if (_cache) return _cache;
    try { _cache = JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); } catch(e){}
    return _cache;
  }
  function saveCache(d){
    _cache = d;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch(e){}
  }

  // ── Fetch latest from GitHub (always uses API for freshness in admin) ──
  let _fetchPromise = null;
  async function fetchRemote(){
    if (_fetchPromise) return _fetchPromise;
    _fetchPromise = (async () => {
      if (!getToken()) {
        return { ok: false, error: 'no_token', data: loadCache() || {} };
      }
      try {
        const r = await fetch(API_URL, {
          headers: { 'Authorization': 'token ' + getToken(), 'Accept': 'application/vnd.github+json' },
          cache: 'no-cache'
        });
        if (r.status === 404) {
          // File doesn't exist yet — treat as empty state
          saveCache({});
          _sha = null;
          _ready = true;
          _readyResolve();
          return { ok: true, data: {} };
        }
        if (!r.ok) throw new Error('fetch ' + r.status);
        const meta = await r.json();
        _sha = meta.sha;
        // content is base64
        const json = JSON.parse(atob(meta.content.replace(/\s/g,'')));
        saveCache(json);
        _ready = true;
        _readyResolve();
        return { ok: true, data: json };
      } catch(e) {
        console.warn('[cloud-storage] fetch failed:', e.message);
        return { ok: false, data: loadCache() || {}, error: e.message };
      } finally {
        _fetchPromise = null;
      }
    })();
    return _fetchPromise;
  }

  // ── Write (commits to GitHub via API) ─────────────────────────
  let _writeQueue = Promise.resolve();

  async function update(partial){
    if (!_ready) {
      return { ok: false, error: 'not_synced' };
    }
    // Merge into cache immediately
    const current = loadCache() || {};
    const merged  = deepMerge(current, partial);
    saveCache(merged);

    // Queue the actual GitHub commit
    const myWrite = _writeQueue.then(async () => {
      const latest = loadCache() || {};
      latest.updatedAt = new Date().toISOString();
      const contentB64 = btoa(unescape(encodeURIComponent(JSON.stringify(latest, null, 2))));

      // Need fresh SHA for each commit (it changes after each successful commit)
      if (!_sha) {
        // Get current SHA before committing
        try {
          const r = await fetch(API_URL, {
            headers: { 'Authorization': 'token ' + getToken(), 'Accept': 'application/vnd.github+json' },
            cache: 'no-cache'
          });
          if (r.ok) { _sha = (await r.json()).sha; }
        } catch(e){}
      }

      const body = {
        message: 'admin: update gallery settings',
        content: contentB64,
        branch: BRANCH
      };
      if (_sha) body.sha = _sha;

      try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
          method: 'PUT',
          headers: {
            'Authorization': 'token ' + getToken(),
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!r.ok) {
          const errText = await r.text().catch(()=>'');
          // If SHA mismatch (409), refresh SHA and retry once
          if (r.status === 409 || (errText && errText.includes('sha'))) {
            try {
              const r2 = await fetch(API_URL, {
                headers: { 'Authorization': 'token ' + getToken(), 'Accept': 'application/vnd.github+json' },
                cache: 'no-cache'
              });
              if (r2.ok) {
                _sha = (await r2.json()).sha;
                body.sha = _sha;
                const r3 = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
                  method: 'PUT',
                  headers: { 'Authorization': 'token ' + getToken(), 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
                  body: JSON.stringify(body)
                });
                if (r3.ok) {
                  const d3 = await r3.json();
                  _sha = d3.content.sha;
                  return { ok: true };
                }
                const e3 = await r3.text().catch(()=>'');
                return { ok: false, error: 'http ' + r3.status + ': ' + e3.slice(0,150) };
              }
            } catch(e2){}
          }
          return { ok: false, error: 'http ' + r.status + ': ' + errText.slice(0,150) };
        }
        const d = await r.json();
        _sha = d.content.sha; // update SHA for next commit
        return { ok: true };
      } catch(e) {
        return { ok: false, error: e.message };
      }
    });
    _writeQueue = myWrite.catch(()=>{});
    return myWrite;
  }

  // ── Deep merge helper ────────────────────────────────────────
  function deepMerge(target, source){
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

  // ── Public read path (used by public pages, no auth) ─────────
  // Reads gallery-settings.json directly from the served file.
  async function fetchPublic(){
    try {
      const r = await fetch(PUBLIC_URL + '?t=' + Date.now(), { cache: 'no-cache' });
      if (r.ok) {
        const j = await r.json();
        saveCache(j);
        _ready = true;
        _readyResolve();
        return { ok: true, data: j };
      }
    } catch(e){}
    // Fallback: use cache
    return { ok: false, data: loadCache() || {} };
  }

  // ── Public API ───────────────────────────────────────────────
  window.RemoteState = {
    // Token management (admin only)
    getToken: getToken,
    setToken: setToken,
    hasToken: () => !!getToken(),
    // For admin (uses GitHub API)
    fetch: fetchRemote,
    update: update,
    // For public pages (uses public file URL, no token needed)
    fetchPublic: fetchPublic,
    // State
    isReady: () => _ready,
    ready: () => _readyPromise,
    getCached: loadCache,
    forceReload: async () => { _cache = null; _sha = null; _ready = false; try{localStorage.removeItem(CACHE_KEY);}catch(e){} return fetchRemote(); },
    // Convenience accessors (always return defaults if missing)
    getAdmin: () => {
      const s = loadCache() || {};
      const a = s.admin || {};
      return {
        hidden:    a.hidden    || [],
        pinned:    a.pinned    || [],
        order:     a.order     || [],
        cats:      a.cats      || {},
        catList:   a.catList   || [],
        rotations: a.rotations || {}
      };
    },
    getHeroVideo: () => (loadCache() || {}).heroVideo || null,
    getReviews:   () => (loadCache() || {}).reviews   || [],
    getPricing:   () => (loadCache() || {}).pricing   || null
  };
})(window);
