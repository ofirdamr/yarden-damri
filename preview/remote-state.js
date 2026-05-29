/* remote-state.js — shared JSONBin sync for Yarden Damri site
 * Single source of truth for: admin gallery settings, pricing, reviews, heroVideo.
 * All stored in one JSONBin record. Write queue prevents race conditions.
 */
(function(window){
  const JSONBIN_KEY = '$2a$10$EUS8yhBdm130KXj7GB56iOGDZEB4Nlkid81ccEKHu/E6x1F6Sxdcm';
  const JSONBIN_BIN = '69f88e09aaba8821976cbc68';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN}`;
  const CACHE_KEY   = 'remote_state_v2';

  // ── In-memory cache ────────────────────────────────────────────
  let _cache = null;

  function loadCache() {
    if (_cache) return _cache;
    try { _cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') || null; } catch(e) {}
    return _cache;
  }
  function saveCache(data) {
    _cache = data;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  // ── Remote fetch (with in-flight dedup) ────────────────────────
  let _fetchPromise = null;
  let _ready = false; // becomes true ONLY after a successful fetch from JSONBin
  let _readyResolve;
  const _readyPromise = new Promise(r => _readyResolve = r);
  async function fetchRemote() {
    if (_fetchPromise) return _fetchPromise;
    _fetchPromise = (async () => {
      try {
        const r = await fetch(JSONBIN_URL + '/latest', {
          headers: { 'X-Master-Key': JSONBIN_KEY },
          cache: 'no-cache'
        });
        if (!r.ok) throw new Error('fetch ' + r.status);
        const d = await r.json();
        const data = d.record || {};
        saveCache(data);
        _ready = true;
        _readyResolve();
        return { ok: true, data };
      } catch(e) {
        console.warn('[remote-state] fetch failed:', e.message);
        // Critical: DO NOT mark ready. This blocks writes so we never overwrite remote with stale local data.
        return { ok: false, data: loadCache() || {} };
      } finally {
        _fetchPromise = null;
      }
    })();
    return _fetchPromise;
  }

  // ── Write serialization (never two writes at once) ────────────
  let _writeQueue = Promise.resolve();

  async function update(partial) {
    // SAFETY: block writes until we've successfully synced.
    if (!_ready) {
      return { ok: false, error: 'not_synced' };
    }

    // 1. Synchronously merge into local cache + localStorage backup
    const current = loadCache() || {};
    const merged = deepMerge(current, partial);
    saveCache(merged);

    // 2. Queue the actual JSONBin write. Each write waits for the previous to finish.
    //    Returns the REAL success/failure from JSONBin — never fake "ok" before confirmation.
    const myWrite = _writeQueue.then(async () => {
      // Re-read cache in case other updates piled in while we waited
      const latest = loadCache() || {};
      try {
        const r = await fetch(JSONBIN_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
          body: JSON.stringify(latest)
        });
        if (!r.ok) {
          console.error('[remote-state] PUT failed:', r.status);
          return { ok: false, error: 'http ' + r.status };
        }
        return { ok: true };
      } catch(e) {
        console.error('[remote-state] PUT error:', e.message);
        return { ok: false, error: e.message };
      }
    });
    _writeQueue = myWrite.catch(()=>{}); // keep queue alive even on error
    return myWrite;
  }

  // Deep merge helper (non-destructive)
  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
          && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        out[key] = deepMerge(target[key], source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  // ── Public API ─────────────────────────────────────────────────
  window.RemoteState = {
    fetch: fetchRemote,
    update: update,
    getCached: loadCache,
    isReady: () => _ready,
    ready: () => _readyPromise,
    forceReload: async () => {
      _ready = false;
      _cache = null;
      try { localStorage.removeItem(CACHE_KEY); } catch(e){}
      return fetchRemote();
    },
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
