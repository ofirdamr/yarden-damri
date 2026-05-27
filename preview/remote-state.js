/* remote-state.js — shared JSONBin sync for Yarden Damri site
 * Stores all admin/site settings in one JSONBin record so changes are public to all visitors.
 *
 * Bin shape:
 *   {
 *     "reviews": [...],            // customer-submitted reviews
 *     "admin": {                   // gallery admin settings (public)
 *       "hidden": [],
 *       "pinned": [],
 *       "order": [],
 *       "cats": {},
 *       "catList": [],
 *       "rotations": {}
 *     },
 *     "heroVideo": "https://..."   // selected hero video URL
 *   }
 */
(function(window){
  const JSONBIN_KEY = '$2a$10$EUS8yhBdm130KXj7GB56iOGDZEB4Nlkid81ccEKHu/E6x1F6Sxdcm';
  const JSONBIN_BIN = '69f88e09aaba8821976cbc68';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN}`;
  const CACHE_KEY = 'remote_state_cache_v1';
  const CACHE_TTL_MS = 60 * 1000; // 1 minute — admin sees own changes immediately because we update cache on save

  let _memCache = null;
  let _fetchInFlight = null;

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.data) return null;
      if (Date.now() - obj.ts > CACHE_TTL_MS) return obj.data; // expired but usable as fallback
      return obj.data;
    } catch(e) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch(e) {}
    _memCache = data;
  }

  // Fetch remote state. Returns object. Always succeeds (falls back to cache or empty).
  async function fetchRemote() {
    if (_fetchInFlight) return _fetchInFlight;
    _fetchInFlight = (async () => {
      try {
        const r = await fetch(JSONBIN_URL + '/latest', {
          headers: { 'X-Master-Key': JSONBIN_KEY },
          cache: 'no-cache'
        });
        if (!r.ok) throw new Error('http ' + r.status);
        const d = await r.json();
        const data = d.record || {};
        writeCache(data);
        return data;
      } catch(e) {
        console.warn('[remote-state] fetch failed, using cache:', e.message);
        return readCache() || {};
      } finally {
        _fetchInFlight = null;
      }
    })();
    return _fetchInFlight;
  }

  // Update fields in remote state. Merges with current remote so other keys are preserved.
  async function updateRemote(partial) {
    const current = (await fetchRemote()) || {};
    const merged = { ...current, ...partial };
    // Optimistic local update so admin UI sees instant change
    writeCache(merged);
    try {
      const r = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(merged)
      });
      if (!r.ok) throw new Error('PUT failed: ' + r.status);
      return { ok: true, data: merged };
    } catch(e) {
      console.error('[remote-state] save failed:', e.message);
      return { ok: false, error: e.message, data: merged };
    }
  }

  // Synchronous getter — returns cached value or null. Useful for first render before fetch resolves.
  function getCached() {
    if (_memCache) return _memCache;
    const c = readCache();
    if (c) _memCache = c;
    return c;
  }

  window.RemoteState = {
    fetch: fetchRemote,
    update: updateRemote,
    getCached: getCached,
    // Convenience accessors with sensible defaults
    getAdmin: () => {
      const s = getCached() || {};
      const a = s.admin || {};
      return {
        hidden: a.hidden || [],
        pinned: a.pinned || [],
        order: a.order || [],
        cats: a.cats || {},
        catList: a.catList || [],
        rotations: a.rotations || {}
      };
    },
    getHeroVideo: () => {
      const s = getCached() || {};
      return s.heroVideo || null;
    },
    getReviews: () => {
      const s = getCached() || {};
      return s.reviews || [];
    }
  };
})(window);
