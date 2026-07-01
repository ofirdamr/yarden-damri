# Yarden Damri Website — Progress Log

> Older entries archived to PROGRESS-archive.md (not auto-read).

## 2026-07-01 — session 10: Homepage PageSpeed follow-up
- Owner sent a mobile PageSpeed Insights link. WebFetch can't read it (results render client-side via
  JS after the fetch); headless Chromium in this sandbox can't TLS-handshake to the live site or any
  external host through the agent proxy even after importing the proxy CA into the NSS trust store
  (`certutil -A -d sql:~/.pki/nssdb -n agent-proxy-ca -t "C,," -i /root/.ccr/agent-proxy-ca.crt` — worth
  keeping for future sessions, but didn't fix the handshake). Lighthouse/Playwright against the live
  domain remains blocked here; **curl-based manual audit is the reliable path** (already known per
  RULE 3, now confirmed for Lighthouse-style checks too).
- Manual audit (curl on live index.html + resources) found real render-blocking issues, fixed the safe
  ones, commit `ed61be8`:
  - Google Fonts `<link rel="stylesheet">` was fully render-blocking → preload+swap async pattern
    (+ `<noscript>` fallback).
  - `site-content.js` was a blocking `<head>` script that only ever runs on `DOMContentLoaded` anyway
    (verified: no synchronous consumers elsewhere in index.html) → added `defer`, zero behavior change.
  - `#heroImage` (the LCP element) got `fetchpriority="high"`.
  - Verified locally via Playwright (desktop 1440×900 + mobile iPhone 13, hero image content faked via
    `page.route` fulfill since cross-origin CDN fetches also fail through this sandbox's proxy): hero
    renders instantly (no dark/blank box), gallery grid still populates (48 tiles), zero console errors.
    Verified live post-deploy: all 3 changes present in served HTML, 200 OK.
- Flagged (not fixed in this commit): `gallery-data.js` (512KB) + `cloud-storage.js` load synchronously,
  and the inline `<script>` right after reads `GALLERY_IMAGES`/`RemoteState` at **top level** — naive
  `defer` would silently break gallery render + hero remote-override on first load. See below — fixed
  properly later this same session, owner asked for it after I explained the tradeoff.

### Same session, part 2: the gallery-data.js/cloud-storage.js defer, done properly (commit `fd0dbac`)
- Extracted the two inline `<script>` blocks that immediately consume `GALLERY_IMAGES`/`RemoteState`
  into external files: `hero-init.js` (was the ~96-line hero-init block, lines 769–864) and `gallery.js`
  (was the ~737-line gallery-render block, lines 869–1605). Used `sed -n` to slice exact line ranges
  into the new files (not retyped) to avoid transcription errors, then `node --check` on both.
- Marked all 4 scripts `defer` in document order: `cloud-storage.js`, `hero-init.js`,
  `gallery-data.js?v=...`, `gallery.js` — same relative order as before, so deferred execution order
  matches the old synchronous order exactly. `defer` scripts still populate global scope (function
  declarations become `window.x` same as inline), so the `onclick="toggleMobileMenu()"` etc. handlers
  elsewhere in the HTML keep working — confirmed no `onclick` handler could fire before these scripts
  finish (defer always completes before DOMContentLoaded, long before a user could plausibly click).
- **Caught a real bug in the process:** `publish-public.yml`'s file list is an explicit allowlist, not
  a wildcard — the two new files would have 404'd on the live site if not added. Added
  `hero-init.js gallery.js` to the `FILES` var.
- **Caught a second real bug:** `fix.js`'s hero-baking regex `/(<img id="heroImage" src=")[^"]*(")/`
  assumed `src=` immediately follows `id="heroImage"` — broke silently once `fetchpriority="high"` (added
  earlier this session, commit `ed61be8`) sat between them. Every future 6h sync would have stopped
  updating the baked hero `<img src>` with no error, just a silent no-op replace. Widened to
  `/(<img id="heroImage"[^>]*\bsrc=")[^"]*(")/` and verified against the actual current markup with a
  one-off `node -e` regex test.
- Verified locally via Playwright (desktop + mobile): hero renders instantly (fetchpriority preserved,
  `display:block`), gallery grid populates (48 `.tile`/`img`/`video` elements — same count as before the
  refactor), zero console/page errors. Also screenshotted the gallery grid itself scrolled into view to
  visually confirm tile structure (video-play icons, carousel checkboxes) rendered correctly, not just
  the element count. Verified live post-deploy: all 4 script tags + both new files served, 200 OK.

## 2026-06-30 — session 9: Pre-marketing QA pass (Hybrid: 4 parallel audits → merge → fix)
- Token-Economist call: Hybrid mode — 4 independent parallel audit subagents (SEO/meta, code health,
  visual/Playwright, Hebrew content+RTL), merged findings into one prioritized list, fixed directly.
- **bride.html SEO**: title/description/JSON-LD no longer lead with "אילת" (was contradicting the
  nationwide-bride positioning); `areaServed` changed City→Country.
- **RULE 5 (em dash) violations removed** from live runtime Hebrew copy: index.html (alt-text builder,
  reviews-empty-state, share title), gallery.html (alt-text builder, share title, comments-empty-state),
  pricing.html (package desc + bullet glyph), reviews.html (share title). 9 real violations found and
  fixed; many more "—" hits in the codebase were CSS/JS comments, correctly left alone.
- **reviews.html**: fixed malformed JSON-LD phone (`+9720547...`→`+972547...`).
- **og:image added** to about/services/gallery/pricing/contact/reviews.html (was missing on 7/11 pages;
  reused existing root `share-preview.jpg`).
- **`.github/workflows/fix-audio.yml`**: removed dead `preview/` references (retired 2026-06-24), aligned
  with `sync-auto.yml`'s root-only existence-guarded commit pattern.
- **Deleted orphan files**: `worker/copywriter-endpoint.js` + `worker/HANDOVER-content-editor.md` — both
  superseded since session 5/6 (the live `/copywriter` route is in `worker/worker.js`, repo-managed,
  deployed via the `Deploy Worker` workflow). Confirmed zero live references before deleting.
- **Visual QA (Playwright)**: hero poster, gallery thumbnails, lightbox desktop action-bar all PASS, no
  regressions. Bug-2 (lightbox action bar position, open since session 3) now confirmed fixed: measured
  ~10px gap from media edge, not pushed to screen far-right.
- **Playwright couldn't run natively in this sandbox** — pre-installed Chromium (1194) doesn't match the
  installed `@playwright/test` version's expected build (1228) + WebKit isn't installed at all. Worked
  around per-audit with a scratchpad-only config pointing at the installed binary; nothing committed to
  repo. CI installs the correct versions itself, so this is sandbox-only, not a real defect.
- Committed `81512f2`, pushed to `main`, mirror→live verified via curl on 4 distinct fixed pages.
- **Flagged, not auto-fixed** (low priority / needs owner call): missing Twitter Card tags repo-wide;
  no JSON-LD on pricing/legal pages; `sitemap-media.xml` missing `lastmod`; orphan `patch-stats.js`
  (no workflow/script references it — confirm with owner before deleting).

## 2026-06-25 — session 5: Editable site text (CMS pilot) + AI copywriter backend
- Backend mission (before the recopywriting mission): made all homepage marketing text manager-editable.
- Architecture (decided with user): JSON-overrides-on-load, homepage pilot, editing+voice now / AI endpoint written for user to deploy.
- `index.html`: tagged 75 text fields `data-edit="home.<section>.<field>"` + `data-edit-label` (incl. SEO title + meta description). Wired `site-content.js` in <head>.
- `site-content.js` (new): fetches gallery-settings.json → applies `content` overrides on load (cache-first, fails safe to baked text). XSS-safe (escape + \n→<br>). Added to publish allowlist.
- `admin.html`: new 📝 תוכן tab. Auto-discovers fields from the live page, grouped by section. Manual edit + 🎤 Hebrew voice dictation (Web Speech API) + ↺ reset + 🤖 AI copywriter consult. Saves via existing Worker /settings under `content` (no Worker change for editing).
- `worker/copywriter-endpoint.js` (new, private): drop-in `POST /copywriter` → Claude (claude-sonnet-4-6) → 3 Hebrew suggestions. `worker/HANDOVER-content-editor.md`: deploy steps + ANTHROPIC_API_KEY secret. AI button shows graceful "not deployed yet" until the user deploys it.
- QA: node --check passed on all 3 JS pieces; text round-trip verified; data-edit keys unique (75); div structure balanced. Live QA on device pending (proxy blocks live site from this env).

## 2026-06-26 — session 5 (cont.): Worker AI endpoint LIVE via repo-managed deploy
- Discovered `Deploy Worker` workflow deployed from `preview/worker.js` (deleted 2026-06-24) → broken since.
- Restored live Worker source to `worker/worker.js` (from user's dashboard paste) + added clean `/copywriter`
  route (Gemini, **gemini-2.0-flash**, 2048 tokens — fixes the 2.5-flash thinking-truncation that returned
  cut-off/raw-JSON suggestions). Fixed `deploy-worker.yml` to deploy from `worker/worker.js` + inherit
  `GEMINI_API_KEY`. Triggered deploy → success. Verified: POST /copywriter=401 (route live), GET /settings=200 (base intact).
- Worker is now REPO-MANAGED: future fixes = edit worker/worker.js + run Deploy Worker workflow (no dashboard editing).
- Admin hardened: recovers clean suggestions from raw/partial JSON; surfaces upstream error detail on failure.
- Earlier garbage test-edits (3 fields) cleaned from gallery-settings.json.

## 2026-06-26 — session 5 (cont.): AI voice transcription + prompt mic
- Replaced browser Web Speech dictation (low Hebrew quality) with record→Gemini transcription:
  admin records audio (MediaRecorder), decodes to mono WAV client-side, POSTs to new Worker
  `/transcribe` route → Gemini (gemini-2.5-flash, thinkingBudget:0) returns clean punctuated Hebrew.
- Added 🎤 dictation button to the AI copywriter prompt box too.
- Deployed via Deploy Worker workflow. Verified: /transcribe=401 (live), admin has new mic.
- NOTE earlier fix: AI copywriter is gemini-2.5-flash + thinkingBudget:0 (gemini-2.0-flash 429'd — key has no free quota for it).

## 2026-06-26 — session 5 (cont.): Editable text expanded to ALL pages
- Tagged every page with data-edit/data-edit-label and registered all in CONTENT_PAGES:
  index 75, about 21, services 28, bride 28, bridal-guide 23, pricing 13, contact 15,
  reviews 21, gallery 5, disclaimer/accessibility/cookies 3 each. Total ~238 fields.
- site-content.js injected into every page <head>. Tagging done via Node string-replace
  (avoids Edit stale-state churn). Validated: no leaked attributes (`> data-edit=`), 1 applier/page.
- Verified live: subpages HTTP 200 with applier + fields. Editor auto-discovers each page's fields.
- Dynamic content left as-is (JS-rendered pricing packages, Google reviews grid, gallery grid).

## 2026-06-26 — session 5 (cont.): SEO-aware AI copywriter
- /copywriter is now field-aware: SEO system prompt on *.meta.title / *.meta.description (keywords +
  length limits), copywriter prompt on body. Page-aware Eilat logic: home/bride/guide → lead with
  "מאפרת כלות / איפור כלות / בכל הארץ", NO אילת (nationwide bridal intent); local pages keep אילת.
- Admin: live char-count hint on SEO title (~60) / description (~160). Worker redeployed, /copywriter=401 OK.
- Key SEO fact captured: title+description show AS-IS in Google SERP; one page = one snippet for all queries
  → intent targeting is per-PAGE, not per-searcher.

## 2026-06-26 — session 5 (cont.): SEO-aware AI, mic policy, SEO setup, hero+nav fixes, architecture lock
- AI field-aware: SEO prompt on meta.title/description (page-aware Eilat logic) + char counters; no AI on name fields; no-invent-names guard; no em dash (prompt+strip); auto-save (2.5s); editor reads fresh from Worker; AI panel close button.
- Mic blocked site-wide by Permissions-Policy microphone=() → changed CF Transform Rule to microphone=(self) via CF API (user token, revoked). Covers future visitor AI assistant too.
- SEO: WebSite+Organization JSON-LD; sitemap lastmod bumped. Owner: Search Console verified (domain) + sitemap submitted; Business Profile exists. Admin keywords panel → direct Search Console queries link.
- Hero blank-on-mobile fixed (#heroImage display:block behind video). Nav overlap on 13-15" fixed (.nav-brand-center hidden 1081-1500px; Playwright-verified). Installed playwright locally (gitignored); @playwright/test already in package.json.
- LOCKED media reveal architecture as CLAUDE.md RULE 4 (owner-permission-only) + RULE 5 (no em dash). Verified grid architecture 100% intact; hero now conforms to it.

## 2026-06-27 — session 6: media-indexing root cause + friendly AI errors
- ADMIN AI errors made human: admin.html now maps Worker/Gemini failures to short Hebrew via aiErrMsg() (rate-limit / service busy / temporary / network) for both /copywriter and /transcribe. No more raw JSON dumps (was showing upstream_503 ... UNAVAILABLE). Live-verified.
- MEDIA NOT INDEXED — root cause found + fixed: sitemap-media.xml listed Cloudinary URLs (res.cloudinary.com/dfjwxc1cw/...) for ALL 160 img + 60 vid entries, every one HTTP 401 → Google could fetch nothing. Real media is on R2 (images.*/videos-new.*) and was never in the sitemap. Rebuilt with real crawlable URLs: 611 images + 165 videos (hidden excluded), valid XML; sampled URLs 200/206. Live-verified (Cloudinary gone, R2 present).
- AUTO-GEN: fix.js now rebuilds sitemap-media.xml from gallery-data.js after every 6h sync (buildMediaSitemap) + bumps sitemap-index lastmod → never stale again. Sitemap already in publish allowlist.
- Search Console: all 3 sitemaps submitted + being read (user confirmed via screenshot). media.xml last-read 26 Jun = OLD broken version; Google will refetch the fixed one.
- VideoObject schema: DEFERRED (decided not now). Sitemap already makes videos eligible. Doing it right needs uploadDate (required) + duration not currently stored → would need fix.js capture + backfill 165 vids; half-done triggers SC errors. Revisit ONLY if, after sitemap re-read, videos still not indexed.
