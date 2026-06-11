
## Mistake: Hidden items showing in lightbox
- **Cause**: `applyFilter('all')` was called before `RemoteState.fetchPublic()` completed, so `allFilteredImages` was built without hidden items loaded yet
- **Fix**: Delay initial `applyFilter` until after `fetchPublic()` resolves
- **Rule**: Always await RemoteState before first render when hidden items must be excluded

## Mistake: getAdminSettings() used localStorage in root gallery
- **Cause**: Root gallery.html had `getAdminSettings()` reading from localStorage instead of RemoteState
- **Fix**: Updated to use `RemoteState.getAdmin()` with localStorage as fallback
- **Rule**: Always use RemoteState for shared state, never localStorage for business data

## Critical Mistake: 2-Day Likes/Comments Debug (June 2026)

**What happened:** Likes and comments stopped working after R2 migration. Took 2 days to fix.

**Root causes (in order):**
1. `sessionStorage` throws silently in incognito on iPhone — igStatsCache was never populated. Should have checked this on day 1.
2. Root `gallery-data.js` was not synced with preview — different data, different post_ids. Should have kept them in sync from the start.
3. `post_id` was missing from gallery items — added fix.js but the skip-existing path didn't update it. Took many sync runs to notice.
4. `instagram-stats.json` was not copied to preview on sync — stats file was stale.

**What I should have done:**
1. **Read all relevant code first** before making any change — gallery.html igStats logic, fix.js entry structure, sync workflow commit step.
2. **Test the exact failure path** — incognito + iPhone = no sessionStorage. This is documented in project instructions. I knew this.
3. **One fix at a time, verify it worked before moving to next.**
4. **Never patch around broken code** — I added post_id hacks, caption matching, missing-stats-ids.json. All were wrong. The real bug was sessionStorage.
5. **Keep root and preview in sync** — gallery-data.js, instagram-stats.json must always be identical between root and preview.

**Rules going forward:**
- ALWAYS check sessionStorage/localStorage usage — Ofir uses iPhone incognito, neither is available
- ALWAYS sync root gallery-data.js = preview/gallery-data.js after any data change
- ALWAYS sync root instagram-stats.json = preview/instagram-stats.json after any data change
- Before debugging data issues, verify the JS can actually READ the data (storage APIs, fetch errors)
- Do not create one-time hack files or workflows — fix the root cause only
