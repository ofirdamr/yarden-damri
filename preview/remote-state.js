/* remote-state.js — shared JSONBin sync for Yarden Damri site
 * Single source of truth for: admin gallery settings, pricing, reviews, heroVideo.
 * All stored in one JSONBin record. Write queue prevents race conditions.
 */
(function(window){
  const JSONBIN_KEY = '$2a$10$EUS8yhBdm130KXj7GB56iOGDZEB4Nlkid81ccEKHu/E6x1F6Sxdcm';
  const JSONBIN_BIN = '69f88e09aaba8821976cbc68';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN}`;
  const CACHE_KEY   = 'remote_state_v2';

  // ── URL ↔ photo ID compression ─────────────────────────────────
  // Each photo has a unique item_id (~17 chars vs ~100 for full URL).
  // We use item_id (NOT id, which is the shared IG post id across carousel photos).
  let _u2id = null, _id2u = null;
  function buildMaps() {
    if (_u2id) return true;
    if (typeof window.GALLERY_IMAGES === 'undefined') return false;
    _u2id = {}; _id2u = {};
    window.GALLERY_IMAGES.forEach(i => {
      const key = i.item_id || i.id; // prefer item_id (unique per photo)
      if (key && i.u) { _u2id[i.u] = key; _id2u[key] = i.u; }
    });
    return true;
  }
  function urlToId(u){ buildMaps(); return (_u2id && _u2id[u]) || u; }
  function idToUrl(s){ buildMaps(); return (_id2u && _id2u[s]) || s; }

  // Compress: deep-walk admin data, replacing URLs with IDs in known fields
  function compressAdmin(admin) {
    if (!admin || typeof admin !== 'object') return admin;
    const out = { ...admin };
    if (admin.hidden)    out.hidden    = admin.hidden.map(urlToId);
    if (admin.pinned)    out.pinned    = admin.pinned.map(urlToId);
    if (admin.order)     out.order     = admin.order.map(urlToId);
    if (admin.cats)      out.cats      = Object.fromEntries(Object.entries(admin.cats).map(([k,v]) => [urlToId(k), v]));
    if (admin.rotations) out.rotations = Object.fromEntries(Object.entries(admin.rotations).map(([k,v]) => [urlToId(k), v]));
    return out;
  }
  function expandAdmin(admin) {
    if (!admin || typeof admin !== 'object') return admin;
    const out = { ...admin };
    if (admin.hidden)    out.hidden    = admin.hidden.map(idToUrl);
    if (admin.pinned)    out.pinned    = admin.pinned.map(idToUrl);
    if (admin.order)     out.order     = admin.order.map(idToUrl);
    if (admin.cats)      out.cats      = Object.fromEntries(Object.entries(admin.cats).map(([k,v]) => [idToUrl(k), v]));
    if (admin.rotations) out.rotations = Object.fromEntries(Object.entries(admin.rotations).map(([k,v]) => [idToUrl(k), v]));
    return out;
  }
  function compressFull(data){ return data.admin ? { ...data, admin: compressAdmin(data.admin) } : data; }
  function expandFull(data){   return data.admin ? { ...data, admin: expandAdmin(data.admin) } : data; }

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
        const raw = d.record || {};
        const data = expandFull(raw); // expand IDs → full URLs for caller
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
      const compressed = compressFull(latest); // shrink URLs → IDs for wire (JSONBin 100KB limit)
      try {
        const r = await fetch(JSONBIN_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
          body: JSON.stringify(compressed)
        });
        if (!r.ok) {
          const body = await r.text().catch(()=>'');
          console.error('[remote-state] PUT failed:', r.status, body.slice(0,200));
          return { ok: false, error: 'http ' + r.status + (body ? ': '+body.slice(0,120) : '') };
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
