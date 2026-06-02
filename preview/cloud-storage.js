/* cloud-storage.js — admin storage via Cloudflare Worker → GitHub
 *
 * The Worker holds the GitHub token and admin password as server-side secrets.
 * Admin authenticates with password only. Works from any device, no per-device setup.
 */
(function(window){
  const WORKER_URL = 'https://api.yardendamri.co.il';
  const PUBLIC_URL = `https://yardendamri.co.il/gallery-settings.json`;
  const CACHE_KEY  = 'cloud_state_v2';
  const PWD_KEY    = 'yd_admin_pwd';

  let _cache = null;
  let _ready = false;
  let _readyResolve;
  const _readyPromise = new Promise(r => _readyResolve = r);

  function getPwd(){ try { return sessionStorage.getItem(PWD_KEY) || null; } catch(e){ return null; } }
  function setPwd(p){ try { sessionStorage.setItem(PWD_KEY, p); } catch(e){} }
  function clearPwd(){ try { sessionStorage.removeItem(PWD_KEY); } catch(e){} }

  function loadCache(){
    if (_cache) return _cache;
    try { _cache = JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); } catch(e){}
    return _cache;
  }
  function saveCache(d){
    _cache = d;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch(e){}
  }

  let _fetchPromise = null;
  async function fetchRemote(){
    if (_fetchPromise) return _fetchPromise;
    _fetchPromise = (async () => {
      try {
        const r = await fetch(WORKER_URL + '/settings', { cache: 'no-cache' });
        if (!r.ok) throw new Error('fetch ' + r.status);
        const data = await r.json();
        saveCache(data);
        _ready = true;
        _readyResolve();
        return { ok: true, data };
      } catch(e) {
        console.warn('[cloud-storage] fetch failed:', e.message);
        return { ok: false, data: loadCache() || {}, error: e.message };
      } finally {
        _fetchPromise = null;
      }
    })();
    return _fetchPromise;
  }

  async function fetchPublic(){
    try {
      const r = await fetch(PUBLIC_URL + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' });
      if (r.ok) {
        const data = await r.json();
        saveCache(data);
        _ready = true;
        _readyResolve();
        return { ok: true, data };
      }
    } catch(e){}
    return fetchRemote();
  }

  let _writeQueue = Promise.resolve();
  async function update(partial){
    if (!_ready) return { ok: false, error: 'not_synced' };
    const pwd = getPwd();
    if (!pwd) return { ok: false, error: 'no_password' };

    const current = loadCache() || {};
    const merged = deepMerge(current, partial);
    saveCache(merged);

    const myWrite = _writeQueue.then(async () => {
      try {
        const r = await fetch(WORKER_URL + '/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': pwd
          },
          body: JSON.stringify(partial)
        });
        if (r.status === 401) {
          clearPwd();
          return { ok: false, error: 'bad_password' };
        }
        if (!r.ok) {
          const text = await r.text().catch(()=>'');
          return { ok: false, error: 'http ' + r.status + ': ' + text.slice(0,200) };
        }
        const d = await r.json();
        return { ok: !!d.ok };
      } catch(e) {
        return { ok: false, error: e.message };
      }
    });
    _writeQueue = myWrite.catch(()=>{});
    return myWrite;
  }

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

  window.RemoteState = {
    getPwd: getPwd,
    setPwd: setPwd,
    clearPwd: clearPwd,
    hasPwd: () => !!getPwd(),
    fetch: fetchRemote,
    fetchPublic: fetchPublic,
    update: update,
    isReady: () => _ready,
    ready: () => _readyPromise,
    getCached: loadCache,
    forceReload: async () => { _cache = null; _ready = false; try{localStorage.removeItem(CACHE_KEY);}catch(e){} return fetchRemote(); },
    getAdmin: () => {
      const s = loadCache() || {};
      const a = s.admin || {};
      return {
        hidden:    a.hidden    || [],
        pinned:    a.pinned    || [],
        order:     a.order     || [],
        cats:      a.cats      || {},
        catList:   a.catList   || [],
        rotations: a.rotations || {},
        privateCats: a.privateCats || []
      };
    },
    getHeroVideo: () => (loadCache() || {}).heroVideo || null,
    getHeroImage: () => (loadCache() || {}).heroImage || null,
    getReviews:   () => (loadCache() || {}).reviews   || [],
    getPricing:   () => (loadCache() || {}).pricing   || null
  };
})(window);
