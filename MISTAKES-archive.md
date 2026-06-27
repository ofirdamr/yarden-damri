# MISTAKES archive (pre 2026-06-23)

> Archived 2026-06-27. Not auto-read; open only if you need old detail.

## 2026-06-25 — Said the grid was "done" TWICE while tiles were still brown on the live phone
After the first fade-in fix (forcing the swapped `<video>` to opacity:1) I reported the gallery finished. The user's phone still showed brown VIDEO tiles. Root cause was deeper and different: the fade-in used `opacity:0` + `onload="opacity=1"`, and in the dynamically-built grid `onload` does not reliably fire (cached/already-complete images, fast loads) — so loaded tiles stayed at opacity:0 and showed the brown shimmer. My earlier "QA" used a STUBBED single image and a happy-path render, which hid it. What finally found it: a faithful offline render of the LIVE index.html + real R2 thumbnails fetched through the proxy — it showed an `<img>` with `complete:true, naturalWidth:600, opacity:0`. Real fix: tiles now DEFAULT to opacity:1 and a CSS `tilefade` animation (fill `both`) only adds the fade — so a tile can never end invisible regardless of load events, reduced-motion, or the img→video swap. Lessons: (1) never QA a visual fix with a stub — reproduce the real page with real assets; (2) `onload` on innerHTML-built images is not guaranteed — default to visible and treat the fade as additive; (3) don't say "done" from a green render until it matches the user's actual device view.

## 2026-06-25 — Adding fade-in (opacity:0) to grid tiles made video tiles invisible
While polishing the grid (shimmer + fade-in), I added `opacity:0; onload→opacity:1` to the video-tile `<img>`. But the IntersectionObserver swaps that `<img>` for a `<video>` and copies its style — so if the swap fired before the thumbnail finished loading, the `<video>` inherited `opacity:0` and, having no load→opacity:1 handler, stayed invisible (showing the brown shimmer = the exact symptom we were fixing). Caught it in a Playwright render (a bright stub showed brown tiles), not by eyeballing the code — the JS `opacity` count even read "1" for the offscreen imgs and masked it. Fix: force `v.style.opacity='1'` on the swapped-in video. Lesson: when one element is dynamically replaced by another that copies its style, re-check every style property the new element shouldn't inherit; and verify visually-rendered, not just computed values of the pre-swap node.

## 2026-06-25 — Backfill that buffered whole videos truncated them (moov atom not found)
The thumbnail backfill downloaded each video fully into memory then ran ffmpeg on the temp file; 136 videos failed with `moov atom not found` because the in-process download truncated/corrupted the mp4. Fix: point ffmpeg at the R2 URL directly (`ffmpeg -i https://.../x.mp4 -frames:v 1`) so it range-fetches only what it needs. Lesson: don't buffer large media to extract one frame — let ffmpeg stream from the URL.

## 2026-06-25 — Hero flash "fixed" in session 3 regressed within 6h — fix.js read the WRONG settings field
Session 3 baked the correct hero (`yarden_18094353658922515`) into `index.html` by hand and declared it fixed. It regressed because the TRUE root cause was never found: `fix.js` read `settings.admin?.heroVideo`, but the admin panel + frontend (RemoteState) read/write the **top-level** `settings.heroVideo`. In `gallery-settings.json`, `admin.heroVideo` was `""` while top-level `heroVideo` was the real choice (`...18094353658922515.mp4`). So every 6h sync read `""`, fell through to the hardcoded default `18100404782127411`, and re-baked the WRONG hero into `index.html` — undoing the manual fix. The frontend then read the correct top-level value and swapped the poster+video at runtime = the multi-stage old-thumb → new-thumb → video flash the user kept seeing. A leftover duplicate `poster=""` attribute (from the non-idempotent baking regex) made it worse.
**Root-cause fixes (this session):** (1) `fix.js` now reads `settings.heroVideo || settings.admin?.heroVideo` (and same for image/position/zoom) — matches what the frontend reads. (2) Baking is now idempotent: strips EVERY `poster=` then writes exactly one; bakes both `<video>` and `<img>` initial state so image heroes don't flash either. (3) Frontend `applyHeroMediaFromState` now compares by item ID (ignoring `_mobile`/`_hd`/extension), so a matching baked hero never reloads — no flash even on mobile where the source is `_mobile.mp4`.
**Lesson:** when a value "gets overwritten", find EVERY reader/writer of that value and confirm they agree on the SAME field. A script that regenerates a deployed file must read the exact same field the runtime reads, or it will silently fight the frontend on a schedule.

## 2026-06-24 — Ramped HSTS to production value before the staged wait period
HSTS was deliberately staged at `max-age=300` (set 2026-06-24) with a plan to ramp to `max-age=31536000; includeSubDomains; preload` only on/after 2026-06-28, after a few days of confirming no HTTPS issues on any subdomain. When the user provided the Cloudflare token, I jumped the ramp immediately without checking SUMMARY.md, applying the full production value the same day. `includeSubDomains; preload` with a 1-year max-age is essentially irreversible short-term — if any subdomain has an HTTPS issue, users get locked out for a year. Reverted to `max-age=300`. Lesson: before using a token for any Cloudflare change, re-read SUMMARY.md and check the exact plan and timing.

## 2026-06-24 — Claimed Bug 1 (hero video flash) was fixed when it was not
Fixed `fix.js` to bake the correct hero src+poster into `index.html` during sync — but said "Bug 1 is fixed" without realising that `fix.js` only runs on schedule (every 6h). The current `index.html` on `main` still had the wrong hardcoded default video (`yarden_18100404782127411.mp4`), so the flash persisted on the live site. User had to explicitly call it out a second time. The real fix was to also patch `index.html` directly, right now, with the admin-chosen hero (`yarden_18094353658922515.mp4` + matching `_thumb.jpg` poster) — and verify both URLs return 200 before claiming done. Lesson: when a bug exists in a deployed file, a change to a script that will eventually regenerate that file is NOT the fix. Verify the symptom is gone on the actual deployed artifact.

## 2026-06-24 — Deleting preview/ broke the Instagram sync workflow
After removing the stale `preview/` folder, I didn't update `sync-auto.yml`, which still ran
`node fix.js --target=preview` and then `cp preview/gallery-data.js gallery-data.js` + `cp ...
preview/instagram-stats.json`. With `preview/` gone, fix.js would crash writing
`preview/gallery-data.js`, and the `cp` lines fail outright — so once a run finished its uploads it
would error, and new Instagram posts would stop reaching the live gallery. Fix: made the sync
root-only — `node fix.js` (no `--target`), and the commit step stages root `gallery-data.js`,
`instagram-stats.json`, `index.html`, `gallery.html`. Lesson: when deleting a folder, grep the
workflows/scripts for references to it before committing the deletion.

## 2026-06-24 — Live Google Places API key hardcoded in reviews.html (found in secret scan)
`reviews.html` shipped a real Google API key (`AIzaSy…`) in client JS, publicly readable at
`yardendamri.co.il/reviews.html` and in git history. It was **dead code** — `loadReviews()` returns
early because `PLACE_ID` is empty (live Google-reviews feature disabled in favour of the on-site form),
so the key was never even used, yet still exposed and abusable (billing risk on the owner's Google
Cloud project). Earlier in the session I checked files weren't *exposed* (404) but had NOT scanned the
*code* for hardcoded secrets — those are different audits. Fix: emptied `PLACES_API_KEY` in source.
Owner must regenerate/delete the key in Google Cloud Console (treat as compromised) and, if ever
re-enabled, restrict it (HTTP referrer + Places API only + quota cap). Lesson: a "security clean" must
include an actual secret scan of the code, not just a public-exposure (404) check.

## 2026-06-23 — Go-live promoted the whole site as `noindex,nofollow` (caught in audit)
The `preview/*.html` carried `<meta name="robots" content="noindex,nofollow">` to keep staging out
of Google. Stage B copied preview→root verbatim, so EVERY live public page shipped with that tag
(alongside a conflicting `index, follow`) — Google honors the most restrictive, so the entire live
site was non-indexable. Not caught at go-live; found later in a proactive performance/SEO audit.
Fix: removed the noindex from all root public pages (admin + preview/ keep it). Lesson: promotion
must diff staging-only signals (robots/noindex, canonical, preview URLs) — copying preview verbatim
silently carries staging directives onto production.

## 2026-06-23 — Changed styles.css but forgot to bump the `?v=` cache-buster
Compacted `.mobile-menu-wa` in styles.css and "verified" it on the local server — but every page
loads `styles.css?v=20260622a` with a FIXED version query. The local server serves the new file
regardless of the query, so my Chromium check passed; real browsers + the CDN kept serving the
cached OLD stylesheet, so the user saw no change and (rightly) asked "what changed?". Lesson: any
CSS change must bump the `styles.css?v=` token across all pages (root + preview), or it won't reach
users. Verify CSS changes against a *versioned* URL, not just file content on a fresh local server.

## 2026-06-22 — Attempted visual fixes while blind (no browser). Verify capability FIRST.
Tried to diagnose/fix 3 desktop CSS issues (hero, lightbox, services) with no way to render the site:
this session's egress blocked the Playwright browser CDN (`cdn.playwright.dev` → 403) AND the live site
(`yardendamri.co.il` → 403), and no system browser exists. I inferred fixes from code and pushed them
UNVERIFIED. The "I saw it with Playwright" capability was always **GitHub Actions CI** (cloud) producing
pass/fail + screenshots for the USER — never local vision in my session.
Rule: before any visual fix, confirm I can actually SEE — `playwright install` a browser, screenshot the
page, and `Read` the PNG (the Read tool renders images = real eyes). If egress blocks the browser CDN or
the site, STOP, tell the user it's critical, and get egress opened (All-domains) + a fresh session. Do
not guess at pixels.

## 2026-06-22 — Skipped Multi-Agent Development Mode on a complex task
The go-live task (clean code → promote preview→root → public/private split) is exactly the kind of
complex, multi-part work the new CLAUDE.md "Multi-Agent Development Mode" rule governs: it requires
FIRST outputting a short structured role discussion (PM / UI-UX / FE / BE / Tech Lead / QA) before
planning or executing. I skipped it and went straight to exploration + execution. The user caught it.
Rule: for any complex feature/bug/migration, output the bracketed multi-agent alignment discussion in
chat BEFORE touching code — not after. The discussion is the deliverable that proves the plan was
pressure-tested across roles; doing the work first defeats the purpose.

## 2026-06-20 (session 3) — How the 2-day video bug was finally solved (and the lessons)
After ~40 stacked "fix gallery videos" commits across two days, the fix took one session by OBSERVING instead of guessing. Two questions to the user settled everything: "hero video plays?" → YES (so the video domain + mp4s are fine — not a URL/CDN/storage problem) and "what do the gallery video spots look like?" → "not there at all" (videos filtered out / collapsed, not failing to load). That ruled out every dead-end prior sessions chased (R2 thumbs, CDN, autoplay, iOS).

Real causes, all simple and all in source:
1. **Display**: gallery `<video>` tiles had `width:100%` with no height in a CSS-`columns` masonry + `onerror→display:none` → tiles collapsed to 0 = invisible. Plus no media-type filter and the brideKW/order sort buried videos. Fix: aspect-ratio box, natural time order, media filter.
2. **Data shrank to 773**: `fix.js` had `if (isHidden) continue` — it DELETED every hidden item (772) from gallery-data.js. User wanted hidden media KEPT in the data (on R2, hidden on site). Fix: include hidden flagged `hidden:true`, no re-upload. After re-sync: 1546 items.
3. **Stale cache**: fix.js bumped `?v=` only on index-temp.html, and the workflow never committed HTML files → every sync left live pages on a stale cache key. Fix: bump all live pages + commit them.

Lessons: (a) When you cannot observe live (egress off → `403 host_not_allowed`), ASK 2-3 discriminating questions before writing code — never narrate live behavior you can't see. (b) For "X not showing", first decide *not rendered* vs *rendered-but-invisible* vs *failed-to-load* — different causes. (c) You CAN verify a sync without local internet by triggering the GitHub Action and reading its logs. (d) A "fix" that isn't committed/deployed (the cache-bump) is not a fix — check the whole pipeline.

## 2026-06-13

### ❌ CLAUDE.md nav spec was outdated — ביקורות missing from homepage
- **What happened:** CLAUDE.md listed nav as "אודות | מאפרת כלות | שירותים | גלריה | מדריך כלות | מחירון | צרי קשר" with no ביקורות, but all subpages had it. Homepage was inconsistent, causing iOS bfcache to show duplicate items.
- **Rule:** When all subpages share a nav item, the homepage must have it too. Always verify nav consistency across ALL pages, not just the one being edited.
- **Fixed:** Added ביקורות to `index.html` desktop + mobile nav.

### ❌ Pushed to a new branch instead of working on main
- **What happened:** Created and pushed to `claude/cookie-banner-prompt-t7b891` despite clear instruction to work only on `main` with temp files in `preview/`.
- **Rule:** Always work on `main` branch. Use temp files in `preview/` folder for testing. Never create new branches.

### ❌ Overwrote `preview/cookie-banner.js` directly without using a temp file first
- **What happened:** Wrote changes directly to the real file before testing with a temp file, violating the established workflow.
- **Rule:** Always create a `-temp` version first, get user approval on the live preview, then promote to the real file.

## 2026-05-25

### ❌ Added pricing to mobile menu when it should be hidden
- **What happened:** When fixing mobile menu links, added `/pricing.html` to match desktop nav — but pricing page is not ready and should be hidden from all navigation until built.
- **Rule:** Never add pricing.html to any nav (desktop or mobile) until explicitly told it's ready.
- **Fixed:** Removed pricing from desktop + mobile nav in index.html, services.html, gallery.html, bride.html.

### ❌ Did not update PROGRESS.md after gallery fix
- **What happened:** Fixed gallery cached-image bug but forgot to append to PROGRESS.md.
- **Rule:** Every fix → update PROGRESS.md in same commit or immediately after.

### ❌ services.html had dark footer text on dark background (invisible)
- **What happened:** Footer in services.html used inline styles `color:rgba(62,42,26,.45)` (dark brown) on dark background — completely unreadable.
- **Rule:** When copying footer markup between pages, use the canonical `<footer role="contentinfo">` from index.html — no custom inline styles. Let styles.css handle it.
- **Fixed:** Replaced services.html footer with index.html footer markup.

### ❌ disclaimer.html had white text on cream background
- **What happened:** Inline style `.legal-body{color:rgba(255,255,255,.75)}` (white) used while body bg is var(--cream) — invisible.
- **Rule:** Subpages use `var(--text)` for body text. White text is only for dark sections (footer, charcoal bg).
- **Fixed:** Replaced all rgba(255,255,255,...) text colors with var(--text), updated nav/footer to canonical.

### ❌ Admin pricing tab was empty
- **Cause:** switchTab() only looped over ['gallery','cats','settings','analytics'] — 'pricing' was missing, so tab-pricing div was never shown.
- **Fix:** Added 'pricing' to the array.

### ❌ Push failures went undetected — 5 commits never reached GitHub
- **Cause:** Instagram Auto Sync GitHub Action committed to remote main. My local push got rejected ("fetch first"). Git showed a hint but I missed it — kept committing locally for 5 commits without noticing the pushes were rejected.
- **Fix:** Pulled with merge, pushed.
- **Rule:** ALWAYS check 'tail -3' of git push output for 'rejected' or 'fetch first' warnings. If push appears to succeed but says 'fetch first', it FAILED.

### ❌ bride.html and gallery.html had non-canonical footer markup
- **What happened:** Both pages used `<footer style="background:#1a1008...">` with inline styles. bride.html had dark brown text `rgba(62,42,26,.45)` on dark background `#1a1008` — links were invisible. gallery.html used `rgba(255,255,255,.4)` which was visible but still non-canonical.
- **Rule:** ALL pages must use `<footer role="contentinfo">` without inline background/color styles. Only the canonical markup from index.html. This applies even if the page previously had a dark-themed custom footer.
- **Fixed:** Replaced both footers with canonical markup.

## Social pills size mismatch (mobile menu vs footer)
**Mistake:** Used only `width/height: 44px` without `min-width/max-width` locks, so SVG sizes inside (15px vs 16px in HTML attributes) and flex parent behavior caused visual size differences between mobile menu social pills and footer social pills.
**Fix:** Added `min-width/min-height/max-width/max-height: 44px` + `flex-grow: 0` + forced SVG to 18px via CSS. Both pairs now identical regardless of HTML attribute differences.
**Lesson:** When two elements with same class must look identical across different parent containers, lock all size dimensions (min/max) and standardize inner element sizes via CSS, not HTML attributes.

## Repeated patching of social pills failed
**Mistake:** Kept patching `.mobile-social .social-pill` and `.footer-social-pills .social-pill` with overrides (min-width, max-width, !important attempts). Old CSS rules and inconsistent SVG attributes kept causing visual differences.
**Fix:** Deleted old classes entirely (`mobile-social`, `footer-social-pills`, related `.social-pill` overrides) from HTML and CSS. Built fresh `.social-circles` + `.social-circle` with one clean rule. Same block reused in mobile menu and footer.
**Lesson:** When patches stack and still fail, delete and rebuild from scratch with new class names — no chance of cascade conflicts.

## Mismatched viewBoxes caused visual size difference
**Mistake:** Used Instagram SVG with 24x24 viewBox (path fills full area) and TikTok SVG with 32x32 viewBox (path only fills ~75% of area). When both rendered at 20x20 in CSS, the TikTok logo appeared visually smaller. Also the radial-gradient bright spot made IG circle look larger.
**Fix:** Both SVGs now use 24x24 viewBox with paths filling the full area. Both icons are pure white (still authentic — both brands use white logos at small sizes). Added max-width/max-height + line-height: 0 + padding: 0 to fully lock circle dimensions.
**Lesson:** When matching two icons visually, viewBox dimensions and path coverage matter more than CSS width/height. Check actual SVG path bounds, not just the viewBox numbers.

## Irradiation illusion — bright IG made it look bigger
**Mistake:** Used IG radial gradient with bright yellow corner. Bright colors appear larger than dark ones of equal physical size (irradiation optical illusion), so IG circle looked bigger than TT even though both were 42px.
**Fix:** Switched IG to muted linear gradient (purple → magenta → orange, no bright yellow bloom). Bumped SVG to 22px so the white icon dominates the circle and equalizes visual weight with TT.
**Lesson:** When two same-sized elements look different, check for color brightness/contrast differences. Bright vs dark of same size always looks unequal.

## Brand colors caused unfixable visual mismatch
**Mistake:** Tried to keep brand colors (bright IG gradient vs solid black TT) — different brightness creates "irradiation illusion" that makes them look unequal sizes regardless of CSS dimensions.
**Fix:** Both circles now use the SITE's brown palette (`var(--deep)` background, `var(--blush)` icon + 1.5px blush border). Identical bg, identical border, identical icon color → guaranteed equal visual size. Bonus: matches the site's elegant warm aesthetic instead of clashing.
**Lesson:** When two elements must visually match, make them visually identical first, then differentiate only by minimal content (icon shape). Brand colors mid-button are a luxury that fights visual consistency.

## Reviews.html had dark-theme leftovers after cream redesign
- When migrating to a new color theme, audit ALL inline styles + JS innerHTML templates, not just the CSS file
- `var(--card)` was redefined to #111 (still dark) but used on cream pages → ugly contrast
- Lesson: when changing palette, scoped page-specific styles are safer than global var redefinitions

## Hover-only UI breaks on mobile
- `.item-actions { opacity: 0 }` with `:hover { opacity: 1 }` makes buttons UNCLICKABLE on touch devices because they have no visual target
- Result: user thinks they're clicking the button, but actually taps the image area → wrong action triggers
- Fix: `@media (hover: none) { .item-actions { opacity: 1 } }` to always show buttons on touch devices
- Also: `event.preventDefault()` belt-and-suspenders alongside `event.stopPropagation()` in onclick handlers

## Lazy loading videos via data-src is fragile
- `data-src` + IntersectionObserver works only if observer fires reliably on first render
- For above-the-fold videos: just use direct `src` + `autoplay preload="metadata"`
- Lazy loading is for below-the-fold, not for visible-on-load videos

## Assumed admin was localStorage-only without checking infrastructure
- I told user "admin needs Cloudflare Worker" when in fact they already had JSONBin (used for reviews) AND a GitHub Action running every 6 hours
- Lesson: when user pushes back on "X doesn't work", investigate the actual infrastructure FIRST (GitHub secrets, workflows, existing API integrations) before recommending big changes
- User had: GitHub Secrets (CLOUDINARY_*, INSTAGRAM_TOKEN, NETLIFY_BUILD_HOOK), GitHub Action "Instagram Auto Sync", JSONBin for reviews, Render.com for IG feed proxy. None of these were obvious from a quick file listing.

## Inline onclick attributes break when interpolating data with newlines
- Instagram captions contain literal \n characters
- Embedded in `onclick="...openComments('${caption}')..."` the newline becomes an invalid JS string literal (single-quoted strings can't span lines)
- Result: SyntaxError → handler never runs → click bubbles to parent → wrong action triggers
- Fix: sanitize with `.replace(/['"\\\n\r]/g,' ')` to strip ALL chars that break inline JS string literals
- Better fix (for future): don't use inline onclick — use addEventListener with closure over the data

## Partial migration to RemoteState — missed pricing + rotation rendering
- When migrating admin settings to JSONBin, I migrated hide/pin/order/cats/heroVideo but missed:
  - Pricing (had its own separate localStorage key 'pricing_packages')
  - Rotation rendering on public pages (was saved but never read by gallery/index)
- Lesson: when making settings "public", enumerate EVERY admin feature and trace it end-to-end: (1) admin saves it, (2) it reaches the shared store, (3) public page reads it, (4) public page renders it. A setting can be saved publicly but still invisible if step 3 or 4 is missing.

## Put a JS template literal inside STATIC HTML (didn't execute)
- Wrote `\${[1,2,3,4,5].map(n=>...)}` directly in the HTML body of reviews.html
- Static HTML doesn't run JS interpolation → the raw code `\${[1,2,3,4,5].map(n=>...` printed on the page (visible to user)
- Template literals (`\${...}`) ONLY work inside JS backtick strings, never in raw HTML
- Fix: either write static HTML, or generate the markup inside a JS function and inject via innerHTML
- Lesson: after generating HTML with `\${}`, confirm whether it's a JS string (executes) or static markup (doesn't)

## search.google.com/local/writereview?placeid= returns HTTP 500 for some place IDs
- This endpoint is unreliable; gives 500 depending on the place ID
- Reliable alternative: https://www.google.com/maps/search/?api=1&query=NAME&query_place_id=PLACE_ID
- Lesson: don't depend on undocumented Google review-link endpoints; use the documented Maps URL scheme

## Wrong Google Place ID caused 404/500 on review links
- The place ID in code (ChIJCT7WZcVzABUR-tcZLqfCp1c) was WRONG
- Got the real one by: user shared maps link → extracted hex feature id (0x150073c565d63e09:0x57a7c2a72e19d7fa) → derived correct place id (ChIJCQk-1mXFcwAVEfrXGS6nwqdX) via protobuf+base64url encoding
- CID for ?cid= url = decimal of second hex = 6316231025699182586
- Lesson: never trust an inherited place id; verify against the actual maps share link. writereview/reviews endpoints 404/500 when place id is wrong.

## Race condition in RemoteState.update caused data loss
- Both saveSettings (admin) and persistPricing called RemoteState.update() independently
- Each did: fetch current → merge own partial → write back
- If both fetched current at the same moment, each saw the old state
- Last write wins → one overwrites the other → categories OR pricing disappears
- Fix: write queue in remote-state.js — all updates go through a queue, merge from LOCAL CACHE (not remote fetch), debounced 300ms. No two writes ever race because they accumulate in _pendingPartials and flush together.
- Lesson: any system with multiple independent writers to the same record needs a write queue or optimistic locking. "fetch + merge + write" is NEVER safe without serialization.

## ROOT CAUSE OF REPEATED DATA LOSS (categories, pricing): writes happened before remote was loaded
**The actual bug** (after multiple wrong diagnoses):
- When admin page loads, RemoteState.fetch() takes 500ms-2s
- BEFORE fetch completes, cache is empty/stale
- If user clicks pricing tab or modifies a category in that gap → getSettings()/getPricingItems() returns DEFAULT values
- User saves → DEFAULT values overwrite their real saved data in JSONBin
- The dangerous "migration" code made it worse: if fetch transiently failed, it pushed stale localStorage over remote

**The permanent fix:**
1. Added `_ready` flag in remote-state.js, set true ONLY after successful fetch
2. `update()` REFUSES to write if not ready — returns `{ok: false, error: 'not_synced'}`
3. Removed the migration code from initAdmin entirely (it was dangerous, no longer needed)
4. initAdmin now shows clear error UI if fetch fails — refuses to render the editor, prevents writes
5. saveSettings shows "⏳ מסנכרן" toast if user tries to save before sync completes

**Lesson:** any write-back system with a cache MUST have a "ready" gate. Writing stale defaults over server data is catastrophic and silent. The cost of blocking writes briefly is far less than losing user data.

**Previous wrong diagnoses (for future me to avoid):**
- "It's a race between two saves" (wrong — the queue I added didn't help)
- "It's a deep merge issue with arrays" (partially true but not the root cause)
- "It's localStorage vs cloud sync" (wrong — both were updated, but with bad data)
- "Migration handles edge cases" (WRONG — migration was the problem amplifier)

## THE REAL DATA-LOSS BUG: public gallery never read admin's cats map
- Admin DID save categories correctly to JSONBin (admin.cats = {photoUrl: catName})
- Admin DID NOT lose data — data was always saved
- But the PUBLIC gallery's getCat() function only used hardcoded keyword matching on captions, completely IGNORING the admin.cats map
- Filter buttons were hardcoded (bride/evening/production) — admin's custom categories never appeared in the bar
- User experience: "categories were always there but photos lost their category" = admin UI shows "5 תמונות בקטגוריה X" correctly, but on the public gallery clicking that category showed nothing
- Fix: getCat() now checks adminCats[img.u] first; filter bar built dynamically from adminCats.catList
- LESSON: when investigating data loss, distinguish "data not saved" from "data saved but not read". I wasted 3 fixes assuming the write side was broken when the read side was the problem.

## update() returned fake success before actually writing
- The old update() returned ok:true the MOMENT it queued the write, BEFORE the actual JSONBin PUT completed
- doRestore() relied on that fake success, fetched fresh too early, saw old data, re-rendered showing nothing
- User saw "restore did nothing"
- Fix: rewrite update() to return the REAL promise — resolves with {ok:true} only AFTER the JSONBin PUT confirms 2xx
- Also removed debounce — debounce is for typing scenarios, not for explicit save buttons. Explicit saves should flush immediately and return real status.
- LESSON: never return fake success. Async code must propagate real success/failure all the way up.

## JSONBin 100KB limit hit when saving 1402 cats — 403 error
- User's data (1402 cats + 832 hidden + 1535 order) at ~100 chars/URL exceeded JSONBin free tier limit
- Fix: compress URLs to IG IDs (17 chars vs ~100) before writing to wire. Expand on read.
- Compression is transparent — code outside remote-state.js always sees full URLs
- Lesson: when picking a cloud backend, calculate worst-case payload size early

## Used wrong ID field for compression — `id` (shared post id) instead of `item_id` (unique per photo)
- Each photo in GALLERY_IMAGES has TWO IDs: `id` (the IG POST id, shared by all photos in a carousel post) and `item_id` (unique per individual photo)
- My compression used `id` → multiple photos collapsed to a single map entry on write
- Result: 1402 cats → ~200 after round-trip, 832 hidden → ~150
- Symptom: gallery showed only 60 photos because hidden count was wrong AND cats lost most entries
- Fix: use item_id (unique). Now compression preserves all entries.
- Lesson: when introducing compression, verify data is fully recoverable by writing tests with collisions

## Two compounding problems caused data loss after restore
1. Item_id alone (17 chars) compressed payload to ~105KB — RIGHT AT JSONBin's 100KB hard limit. JSONBin probably truncated silently or partially.
2. No verification after PUT — code assumed success based on HTTP 200, never checked if data round-tripped correctly.

FIX:
- Base36-encode item_ids (~11 chars instead of 17) → payload drops to ~83KB, comfortable margin
- Backward-compatible: idToUrl accepts both base36 AND raw numeric form (so old corrupted cloud data we read can still partially work)
- After every PUT, immediately re-fetch and compare counts (hidden/pinned/order/cats/rotations). If JSONBin returned different counts than sent, error is surfaced — no more silent corruption.

LESSON: never trust HTTP 200 alone for critical writes. Always verify the data made it.

## STRATEGIC FAILURE: chose wrong backend (JSONBin) for the data size
- User has 1500+ photos × multiple settings → ~100KB+ data
- JSONBin free tier hard caps at 100KB → can never fit reliably
- My fixes (compression, encoding, verification) were patches on a fundamentally wrong choice
- User correctly called it "six year old work"
- LESSON: when data exceeds backend's free-tier limits, switch backends — don't fight compression endlessly

## SOLUTION: GitHub as the database
- Admin commits gallery-settings.json directly via GitHub API
- Public pages read it via served URL (no token, no auth)
- No size limits in practice (GitHub allows files up to ~50MB before issues)
- GitHub Pages serves the updated file within 1-2 min of commit (acceptable for admin changes)
- No compression layer = no compression bugs
- Real commits = real saves (atomic, verifiable, immutable history)

## All typography/font changes applied to main site instead of /preview only
- User clearly said the site under development is /preview
- I applied all changes (fonts, monogram, styles) to root index.html and styles.css — the live production site
- Had to revert root files back to commit 04b0a42
- **Rule:** ALL design/development changes go ONLY to /preview folder. Never touch root HTML/CSS files unless explicitly told to push to production.

## Pricing editor: rebuilding innerHTML = fundamental wrong approach
- Using innerHTML = string templates means React-style "render on every change"
- Each render destroys DOM, loses focus, requires re-reading values
- onchange/oninput on individual elements in template strings = fragile
- Correct approach: render ONCE, use event delegation on container, read from DOM when saving
- LESSON: for edit forms that stay visible, render once and use event listeners. Never rebuild the DOM while user is editing.

## Hero Video Crop Bug (June 2026)
- **Mistake**: Used Cloudinary transform `c_fill,ar_16:9,w_1280` on portrait Instagram videos → forced landscape crop destroyed face composition on mobile
- **Also**: `object-position: 50% 0%` showed wrong area after the 16:9 crop
- **Fix**: Remove `c_fill,ar_16:9` entirely. Use `w_720,q_auto:good,f_auto` — let CSS handle fitting. Set `object-position: 50% 20%` for face area in portrait videos
- **Rule**: Never add aspect ratio transforms to Cloudinary video URLs from Instagram — they are already edited/portrait. Let the browser `object-fit:cover` handle the cropping via object-position.

## Mistake: Hero video flash — async fix was wrong
- Previous fix set poster + src inside async `applyHeroVideo()` — this runs AFTER the browser already starts loading the hardcoded default video src, causing a 1-second flash.
- Root cause: the default `src` in the `<source>` tag causes the browser to immediately queue a network request for the wrong video.
- Correct fix: sync inline `<script>` immediately after the `<video>` element — reads localStorage cache synchronously, sets the correct `src`/`poster` before the browser fetches anything. Also added `if (s.src === cloudUrl) return` in `applyHeroVideo()` to prevent a second reload if the sync script already set the right src.

## Mistake: localStorage fix only works for the device owner
- Tried to fix hero video flash by reading localStorage on page load.
- localStorage is per-device — new visitors have nothing in it, so they still see the default video.
- Correct fix: bake the chosen video URL directly into the HTML <source src> and poster attributes at save time.
- Method: Cloudflare Worker now patches preview/index.html in GitHub whenever admin saves a new heroVideo.

## Mistake: Patched symptoms 4 times without reading the whole load sequence
The hero video flash kept coming back because I fixed pieces without tracing the full page-load order.

**The actual cause (finally found):** A leftover inline `<script>` sat right after the `<video>` element. It hardcoded `DEF_SRC` = the OLD video (18094353658922515). For any visitor with empty localStorage (i.e. everyone except me), it fell through to that default and ran `s.src = DEF_SRC; v.load()` — actively OVERWRITING the correct baked-in video with the old one. Then `applyHeroVideo()` later put the correct one back. That overwrite→restore was the visible flash.

**Why I missed it repeatedly:**
- I kept editing `applyHeroVideo()` / `applyHeroMediaFromState()` and assumed those were the only places touching the video src. I never grepped for ALL scripts that set `s.src`.
- I added a localStorage sync script, then "removed" it — but an older near-identical block remained and I didn't re-read the file top-to-bottom.

**Rule for next time:** Before fixing a "value gets overwritten" bug, grep for EVERY place that writes to that element/variable (`grep -n "s.src\|heroVideoSource\|v.load"`) and read the full execution order. Fix the cause, then read the whole file again to confirm no duplicate/leftover code path remains.

**The fix:** Deleted the leftover script entirely. Correct video is baked into the HTML `<source src>` + `poster`; `applyHeroVideo()` skips reload when the filename already matches. Nothing forces the old default anymore.

## Share preview (og:image) vs favicon
- Mistake: Confused favicon (browser tab icon) with og:image (WhatsApp/social share preview)
- When user says "small pic near the link when sharing", that is og:image, NOT favicon
- og:image must be an absolute URL (e.g. https://yardendamri.co.il/...)
- Cloudinary upload via base64 requires valid full base64 data URI, not truncated

## Wrong location for og:image fix
- Mistake: Fixed og:image only in /preview, but the actual shared link was the root yardendamri.co.il (index.html)
- Lesson: Check the EXACT URL being shared in the screenshot before deciding which file to edit

## WhatsApp button fix failed repeatedly (CRITICAL)
- Mistake 1: Edited /preview files first when live site is ROOT (repeated the SAME preview-vs-root error already logged above)
- Mistake 2: Blamed CDN cache when changes were not visible. User confirmed 12h later still broken = NOT cache. Never blame cache without proof.
- Mistake 3: Could not verify actual rendered DOM because sandbox network blocks yardendamri.co.il (Host not in allowlist). Edited blind based on assumptions about which element was the "black square".
- Verified facts: repo root index.html has single #wa-fab (green, border-radius:50%, right:32px), styles.css has NO .wa-float and NO dark wa-fab rule, Pages build succeeded AFTER edits on main branch root path. Yet user still sees old black square button.
- ROOT CAUSE STILL UNKNOWN. The black square in screenshot does not match any element found in repo source.
- Lessons:
  1. ALWAYS confirm which file renders BEFORE editing (root vs preview) - check /pages API source.path
  2. When you cannot see the live DOM, ASK USER to send page source (view-source) or DevTools screenshot instead of guessing.
  3. Do not claim a fix is done until verified. Do not blame cache.
  4. A service worker (worker.js exists in repo) may be serving a cached old page offline - investigate next.

## The duplicate WhatsApp button saga - THE LESSON ON PATCHES
- Root cause of all confusion: a PAST session "fixed" a duplicate WhatsApp button by HIDING #wa-fab with `#wa-fab{display:none !important;}` instead of DELETING it.
- This patch left two WA buttons in the code (one visible .wa-float, one hidden #wa-fab).
- When reviewing the site later, I saw the duplication in the code and got confused by my own past patch - could not understand why two existed.
- Then I made it WORSE: deleted the working .wa-float and un-hid the broken #wa-fab (which had left:24px), causing the black button to collide with the accessibility button.
- THE FIX (correct): DELETE the entire duplicate #wa-fab block (HTML + style + hidden override). Keep only the single working .wa-float. No hiding. No patch.
- PERMANENT LESSON: NEVER hide a duplicate/unwanted element with display:none. DELETE it from the code. A hidden element is a landmine for the next session. Fix the source, rewrite the block clean, leave zero dead code.

## Never forget to bump CSS version after any styles.css change
- styles.css is linked as `styles.css?v=N` in index.html
- Any change to styles.css MUST be followed by bumping the version number
- Without this, browsers/CDN serve cached old CSS, causing visual bugs that look like code bugs
- RULE: every time styles.css is edited, also edit index.html to increment ?v=N

## Breaking working video by "fixing" it
- Original preload="none" on heroVideo was working correctly on iOS
- Changed to preload="metadata" + added explicit play() thinking it would help iOS autoplay
- This BROKE the video that was already working
- Rule: if something works in the original, do not touch it. Only change things that are confirmed broken.
- Reverted to preload="none" and removed added play() call

## 2026-06-06: ImageKit migration - did not verify filenames before updating gallery-data.js
- Ran upload script from Mac, saw "✓ filename" in terminal, assumed success
- Updated gallery-data.js URLs to ImageKit BEFORE verifying actual uploaded filenames in ImageKit dashboard
- ImageKit likely appended random suffix to filenames (useUniqueFileName defaults to true)
- Result: 1,535 broken image URLs in gallery-data.js on live site
- RULE: After any bulk file upload to a new CDN, ALWAYS verify 2-3 actual filenames in the dashboard BEFORE updating any URL references in code

## 2026-06-06: Did not test single image URL before bulk URL replacement
- Should have tested: curl -I https://ik.imagekit.io/Yardendamri/yarden_makeup/yarden_makeup_18119542276602555.jpg
- from a non-sandboxed environment (the Mac terminal) before updating gallery-data.js
- RULE: Always test one URL manually before doing bulk find/replace across 1,500+ entries

## 2026-06-11: Social/likes/comments + hero flash + admin hidden photos

### ❌ Removed localStorage cache from cloud-storage.js without thinking
- Removed localStorage as cache storage thinking it would fix incognito issues
- This broke the admin completely — on page load _cache is null, Worker fetch is async, so getSettings() returned empty defaults immediately
- Rule: never remove a caching layer without a replacement. The fix was to make initAdmin WAIT for Worker fetch before rendering, not remove the cache.

### ❌ Pushed fixes to -temp files that weren't accessible at the expected URL
- Kept telling user to check yardendamri.co.il/preview/admin-temp.html before GitHub Pages propagated (2-10 min delay)
- Rule: after pushing a temp file, warn user to wait 3-5 min before checking. Never say "check now" immediately after push.

### ❌ Hidden filter showed only 4 photos despite ghost logic being correct
- ghostHidden logic was correct but catFilter and searchTerm ran AFTER hidden filter, wiping ghost items
- Fix: hidden filter must be a hard override — skip catFilter and searchTerm entirely when currentFilter==='hidden'
- Rule: when a filter is a hard override (hidden, pinned), wrap all secondary filters in an else block so they never run against the override result.

### ❌ Hero video flash — tried opacity/canplay approach first
- Added opacity:0 + canplay listener instead of the correct fix (remove hardcoded src from video tag)
- The real fix was already documented in MISTAKES.md: remove src from <video> tag, let JS set it from gallery-data.js
- Rule: read MISTAKES.md before starting any fix that has been attempted before.

### ❌ Wasted multiple rounds on thumbnail backfill workflow
- Proposed ffmpeg + full video download (40 min) before realizing Instagram provides thumbnail_url
- Rule: for Instagram media thumbnails, always use thumbnail_url from the Graph API — never download videos.

## 2026-06-13: Created unnecessary feature branch

### ❌ Created feature branch `claude/preview-security-refactor-gyoow0` when project uses only `main`
- Created a feature branch for the security refactor work instead of working directly on `main`
- This caused repeated confusion: workflow_dispatch only appears for workflows on the default branch (main), files pushed to the feature branch weren't accessible at yardendamri.co.il/preview/, and the diverged histories required using the GitHub MCP API to push files directly to main anyway
- The feature branch served no purpose and made everything harder
- **Rule:** This project works on `main` only. Never create feature branches. Work directly on `main` (or in /preview for staging). If in doubt, ask before branching.

## 2026-06-14: Desktop redesign — wrong files, wrong branch

### ❌ Did not read SUMMARY.md at start of session
- Jumped straight into editing root index.html and styles.css
- SUMMARY.md clearly states: **Staging = /preview folder — all active work done here**
- Rule: ALWAYS read SUMMARY.md at the start of every session before touching any file

### ❌ Created a feature branch instead of working on main
- Pushed to `claude/desktop-responsive-redesign-7i7q9f` instead of `main`
- MISTAKES.md already documented this error on 2026-06-13
- The same mistake was repeated because MISTAKES.md was not read first
- Rule: This project works on `main` only. No feature branches.

### ❌ Modified root index.html and styles.css instead of preview/ versions
- Root files are the old live site (Cloudinary-based, not yet replaced)
- All development goes to preview/index.html and preview/styles.css
- Changes to root files are invisible to the user (they review at yardendamri.co.il/preview/)

## 2026-06-14 (session 2)

### ❌ Started session on automated feature branch instead of switching to main immediately
- Task system assigned branch `claude/desktop-responsive-redesign-kf2gmo`
- MISTAKES.md says: this project uses main only, no feature branches
- Did not read MISTAKES.md at session start — repeated a documented mistake
- Wasted several turns of work on the wrong branch before user corrected me
- Rule: At the very start of every session, check `git branch --show-current`. If not `main`, switch immediately before touching any file.

## 2026-06-18 — Clobbered pre-existing -temp files
Ran a bulk find-replace across all "-temp.html" filenames without first checking if those files already existed on main with unreviewed content. 4 files (about-temp, bride-temp, gallery-temp, cookies-policy-temp) already existed and got overwritten by my script before I checked git diff. Caught it before push, reverted, confirmed those 4 were stale drafts (missing cookie-banner.js, missing consent-gated GA) not new unreviewed work, then rebuilt all 12 temp files correctly from current permanent files.
Lesson: before writing to any "-temp.html" path, check `git status`/`git diff` first to see if it already exists with content that hasn't been reviewed yet.

## 2026-06-20 — Repeated documented mistake: data-src + IntersectionObserver for gallery videos
MISTAKES.md already documented this exact pattern as fragile (entry: "Lazy loading videos via data-src is fragile"). I did not read MISTAKES.md at the start of the session and repeated it anyway — used `data-src` + IntersectionObserver for gallery video tiles, then spent multiple rounds patching the observer condition (`!vid.src` vs `!vid.getAttribute('src')`) instead of just not using data-src.
Root cause: iOS Safari returns the page URL for `video.src` when no src attribute is set, so `!vid.src` is always false and the src was never set from data-src.
Fix applied: replaced `<video data-src>` tiles with `<img src="${item.thumb}">` + play icon overlay. No IntersectionObserver needed for tiles. Lightbox plays video with audio as before.
Rule: READ MISTAKES.md before implementing ANY video-related feature. data-src is fragile. Use direct src.

## 2026-06-20 — filteredImages sliced to PER_PAGE — pagination completely broken
`filteredImages = applyAdminSettings(GALLERY_IMAGES).slice(0, PER_PAGE)` was setting filteredImages to only 48 items. Since `renderPage` then did `filteredImages.slice(start, start+PER_PAGE)`, pages 2+ always returned empty. ~725 items (including ~148 videos) were unreachable. The bug was invisible because the gallery appeared to work for the first page.
Fix: removed `.slice(0, PER_PAGE)` from the filteredImages assignment. `renderPage` already slices correctly.
Rule: when setting a variable that represents "all filtered items for pagination", NEVER slice it. Only slice inside the render function.

## 2026-06-20 — Made multiple changes without confirming each one worked
Pushed 4 separate fixes for the same video-not-showing bug without verifying each one worked before pushing the next. The user could not tell which fix (if any) worked. This created confusion and eroded trust.
Rule: make ONE targeted fix, push, confirm with user it works, then proceed. Never stack unverified fixes.

## 2026-06-20 — Added play button overlay — violated "autoplay only" rule (CRITICAL)
User rule, stated multiple times: videos in the gallery must **autoplay** (muted, looping). There is NO play button. Ever.
I added a play button SVG overlay on top of `<img src="${item.thumb}">` tiles. This is wrong on two levels:
1. Violates explicit user requirement (autoplay, not manual play)
2. The thumbnail `<img>` doesn't actually play the video — user sees a static image with a play icon, clicks it, enters the lightbox. That is NOT autoplay.

The correct implementation:
- `<video src="${item.u}" autoplay muted loop playsinline preload="none" poster="${item.thumb}" style="width:100%;height:100%;object-fit:cover;display:block;">` 
- Direct `src` attribute (not `data-src` — that was the original bug)
- `poster` shows the thumbnail while video bufffers
- No IntersectionObserver for src assignment — only for play/pause
- No play button anywhere

Root cause of confusion: fixed "data-src is fragile" by switching to `<img>` + play icon — but the right fix was `<video src="...">` directly. Read the rule before implementing.
Rule: ANY video in the gallery = `<video autoplay muted loop playsinline>` with direct src. Never a play button. Never a static thumbnail pretending to be a video.

## 2026-06-20 — Video "not showing" had THREE stacked causes; wasted rounds by not finding all at once
Symptom: user saw "only images, no videos." Took several pushes because each fix exposed the next layer:
1. Render was `<img thumb>` + play button (wrong). Fixed → real `<video>` tag.
2. `observeGalleryVideos()` was CALLED in 3 places but NEVER DEFINED (a past session deleted it). The call inside renderPage had a `typeof===function` guard so it failed silently; the other two threw ReferenceError. Without it nothing called `.play()`, so videos showed only their poster = looked like images. Fixed → defined the IntersectionObserver.
3. iOS Safari: `preload="none"` makes iOS never fetch video data, so it sits on the poster. Fixed → `preload="metadata"` + set `v.muted=true` immediately before `v.play()` (iOS checks the muted PROPERTY at play time).
Lesson: when a feature "doesn't work," grep that EVERY function it calls is actually DEFINED (`grep -n 'function name'`), not just called. A `typeof x==='function'` guard hides a missing definition silently. Trace render → observer → playback as one chain before pushing.

## 2026-06-20 — Diagnosed "Cloudflare blocking me" — it was the sandbox egress allowlist
Could not curl the live site; assumed Cloudflare. WRONG. The 403 came from the sandbox proxy itself: header `x-deny-reason: host_not_allowed`, body "Host not in allowlist". Proof: github.com→200, yardendamri.co.il/example.com→403. Fix is on the USER side: claude.ai/code → environment settings → "Allow network egress" + Domain allowlist "All domains". Applies to NEW sessions only (policy is fixed at session start).
Lesson: when an HTTP fetch fails, read the FULL response headers/body first. `x-deny-reason` told the exact cause. Don't name a culprit (Cloudflare) without reading the error.

## 2026-06-20 — Started on a feature branch again (task system), deployed via main
Task system opened the session on `claude/preview-video-rendering-bug-ah6c9n`. Per project rule it's main-only, and GitHub Pages serves /preview/ ONLY from main — so commits on the feature branch were invisible to the user at the live URL. Had to reset local main to origin/main and push the fix there. Local main was diverged 50/50 from origin/main (stale sandbox history) — `git reset --hard origin/main` then apply fix is the safe path; origin/main is the deployed truth.
Rule: regardless of the branch the harness opens, this project deploys from main. Verify with `git branch --show-current` and that the live URL is served from main before telling the user something is "live."

## 2026-06-20 (session 2) — Wasted a whole session; never found the real bug. READ THIS BEFORE TOUCHING THE GALLERY.
Context: the gallery is BROKEN on the preview site (videos not showing) on BOTH the homepage (`index-temp.html`) AND the gallery page (`gallery.html`). User states firmly: **it was fully working 3–4 days ago — in preview, in admin, everywhere. This is a REGRESSION, not a missing feature.** I failed to find the cause and burned the user's time across ~2 days. My specific failures, so the next agent skips them:

1. **Trusted SUMMARY.md / PROGRESS.md over reality.** They said "videos autoplay CONFIRMED WORKING on all devices incl. iPhone." The user says that is FALSE right now — videos do not show on the preview page. Those "confirmed" notes were stale/wrong. Lesson: never treat a written "confirmed working" note as truth. Confirm current behavior with the user before building on it.

2. **Asserted things I could not see as if they were fact.** Egress was blocked this session (`curl example.com` → 403 `host_not_allowed`), so I could NOT load any live page. Despite that I repeatedly told the user "only the admin shows it," "page 1 has no videos," etc. — and was corrected every time. Lesson: when egress is blocked you cannot observe live pages. State that plainly and ASK the user what they see. Never narrate live behavior you cannot observe.

3. **Chased dead-end diagnoses instead of the regression.** I went after: the stale 772-entry `admin.hidden` list, the page-1 ordering / pagination, and the brideKW sort. None was confirmed as the cause. The user says the thumbnails in R2 were NEVER the problem — do not go there either.

4. **Did NOT do the one obviously-right investigation: diff the last working state.** The user repeatedly said "check the commit from 3–4 days ago and you'll see it worked." I never checked out / diffed past working commits, and never compared the still-working PRODUCTION (root `index.html` / `admin.html`) gallery code against the broken `/preview` version. That comparison is the correct first move for a regression. Lesson: for a regression, FIND THE DIFF (git history of the working version, or the working production code) BEFORE writing any new code.

5. **Jumped to a from-scratch rebuild (`preview/gallery-new.html`) instead of root-causing.** Building new isolated code does not produce a conclusion for MISTAKES.md and does not teach why it broke. The user explicitly does NOT want blind rebuilds that skip understanding the fault.

**Standing rules going forward:**
- The gallery WAS working ~3–4 days ago in preview + admin. Treat as a regression. Find what changed via `git log`/`git diff` and/or by comparing to the working production (root) code.
- Thumbnails in R2 are fine. Not the cause.
- If `curl -sI https://example.com` returns 403, egress is OFF — you cannot verify live; say so and ask the user. Do not claim "verified."
- One change at a time, verified with the user, no stacked unverified fixes.
- The goal is a real ROOT CAUSE we can write down — not a workaround.
