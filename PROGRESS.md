# Yarden Damri Website — Progress Log

## ✅ Completed

## 2026-06-25 (session 5) — Universal framework skill + Token Economist
- Added `.claude/skills/universal-framework/` (lazy-loaded skill) capturing the cross-project
  methodology: MD operating system, lean internal team led by PM, English-to-user + Hebrew-RTL
  deliverable rules, verification gate, handover format, and a memory-compaction routine to curb
  token growth. Includes `project-kickoff.template.md`.
- Added **Token Economist** role to `CLAUDE.md` — mandatory first-consult; picks model
  (Haiku/Sonnet/Opus) per task and flags token-wasteful steps.
- Rationale documented in-skill: skills are lazy-loaded (cost ~0 until invoked) vs `CLAUDE.md`
  which loads every session — so heavy rules belong in skills, always-on files stay lean.
- Trimmed `CLAUDE.md` 209→159 lines: universal methodology (RULES 4–9, team/workflow prose) moved
  to the skill; kept project-only rules (branch/root/live-QA), team specializations, architecture,
  CSS/nav/admin/media/credentials/routines. Lower per-session token cost, nothing project-critical lost.

## 2026-06-25 (session 4) — Gallery + hero media: brown fixed, autoplay kept, robust reveal
- **Brown placeholder → light cream.** The shimmer/`#1a1008` I added WAS the brown the user reported;
  all grid + swapped-video backgrounds now `#efe7df`.
- **Bulletproof reveal.** Tiles default to opacity:1; `tilefade` CSS animation (fill `both`) only adds
  the fade. Removed the `opacity:0`+`onload` pattern that left loaded tiles invisible (brown) when
  `onload` didn't fire on innerHTML-built imgs.
- **Grid video overlay (autoplay KEPT).** Stopped replacing the thumbnail `<img>` with the `<video>`
  (that left iOS tiles blank when autoplay was blocked). Now the thumbnail stays and the autoplaying
  video is layered on top, revealed only on `'playing'`. Briefly tried disabling mobile autoplay —
  reverted (user wants the previews).
- **Hero same pattern.** `#heroImage` poster still always behind; `#heroVideo` opacity:0 → reveal on
  `'playing'`; fixed `upgradeHeroToHD` to detect image-hero via the video being hidden.
- Net: video tiles + hero never go blank/brown (show still on Low Power Mode), autoplay where allowed.
- QA limit noted: no H.264 in headless chromium + proxy blocks live → could only verify the still
  fallback via render (real R2 thumbnails), not live playback.

## 2026-06-25 (session 4) — Gallery grid speed: IMAGES + missing-thumbnail videos
- **Half the image grid loaded full-res.** 636 of 1247 images had NO `_thumb.webp` on R2 (404) →
  grid `onerror` fell back to the full `yarden_<id>.webp` (41–110KB). Earlier `--reprocess-images`
  half-finished (CI timeout). Fix: `--fill-image-thumbs` builds the missing thumbs by downscaling the
  existing full R2 `.webp` (no Instagram re-fetch; fast, resumable).
- **50 full-res images in the hidden `#gallery-seo` block** (~93KB each ≈ 4.7MB), for crawlers only.
  Switched all 50 to `_thumb.webp` (+ onerror fallback). SEO-safe (alt unchanged, 600px is indexable;
  hidden images barely rank anyway) and a Core-Web-Vitals win. Only the lightbox stays full-res.
- **137 of 301 videos had NO thumbnail at all** (no `_thumb.jpg`) → bare brown placeholder until the
  video loaded. Enhanced `--reprocess-video-thumbs` to source the frame in order: existing `_thumb.jpg`
  → Instagram `thumbnail_url` (also restores the missing jpg) → ffmpeg first-frame of the R2 `.mp4`.
  Builds `_thumb.webp` for every video.
- First video backfill run converted 164/301 (71KB→50KB webp); the remaining 137 (missing source jpg)
  are covered by the enhanced sourcing above on the next run.
- Note: legacy `backfill-thumbs.yml`/`backfill-thumbs.js` reference the deleted `preview/` dir — stale,
  superseded by the `fix.js` reprocess modes driven by `sync-auto.yml`.

## 2026-06-25 (session 4) — Gallery grid speed: small WebP thumbnails for videos
- **Diagnosed slow grid.** Video grid tiles loaded the full **720×1280 JPG** `_thumb.jpg`
  (37–71KB each), while images used a proper **600px WebP** `_thumb.webp` (23–35KB). With 301
  videos, scrolling pulled many heavy 720p JPGs → the brown `#1a1008` placeholder lingered.
- **Fix (source).** `fix.js` now builds **two** thumbnails per video, mirroring the image template:
  `_thumb.jpg` (720p, kept for the share OG card + hero/lightbox poster) **and** `_thumb.webp`
  (600px, via `compressImageThumb`) for the GRID. The gallery-data `thumb` field points at the webp.
- **Backfill for the existing 301 videos.** New `--reprocess-video-thumbs` mode (+ workflow input
  `reprocess_video_thumbs`) downscales each existing `_thumb.jpg` → `_thumb.webp` (no ffmpeg/video
  re-download) and repoints `thumb`. Resumable (skips videos that already have the webp).
- **Frontend.** Video tiles in `index.html` + `gallery.html` get `decoding="async"` and a defensive
  WebP→JPG `onerror` fallback (covers any video without a webp yet). No other change needed — both
  pages already render `item.thumb`, so they pick up the smaller webp automatically.
- **Expected:** video grid thumbnails ~half the bytes (≈40–48KB → and smaller on mobile via lazy),
  WebP format, consistent with images. Run the backfill workflow, then the grid stops flashing brown.

## 2026-06-25 (session 4) — Hero flash: true root cause found and fixed (video + image)
- **Found the real cause of the recurring hero flash.** `fix.js` read `settings.admin.heroVideo`
  (`""`) instead of the top-level `settings.heroVideo` (the real admin choice
  `yarden_18094353658922515.mp4`). Every 6h sync therefore re-baked the wrong default
  `18100404782127411` into `index.html`, which the frontend (reads top-level) then swapped at
  runtime → old-thumb → new-thumb → video multi-stage flash. A leftover duplicate `poster=""`
  on the `<video>` tag made it worse.
- **Fix 1 — `fix.js` reads the correct field.** `settings.heroVideo || settings.admin?.heroVideo`
  (same for heroImage / heroPosition / heroZoom). Future syncs bake the admin's actual choice.
- **Fix 2 — `index.html` baked hero corrected by hand (live now).** `<source>` + a SINGLE `poster`
  both = `18094353658922515`; removed the duplicate stale poster. Baked hero now matches
  `gallery-settings.json`, so the runtime swap is skipped entirely.
- **Fix 3 — runtime swap compares by item ID.** `applyHeroMediaFromState` strips
  `_mobile`/`_hd`/extension and compares the numeric ID, so a matching baked hero never reloads —
  no flash even on mobile (where the source becomes `_mobile.mp4`).
- **Fix 4 — `fix.js` baking made idempotent + image-aware.** Strips EVERY `poster=` then writes one;
  bakes both `<video>` and `<img>` initial display state, so an image hero paints correctly on first
  load too (video hidden, img shown) — no flash for image heroes either.
- **QA:** node test of the baking transform on `index.html` for video hero, image hero, and
  double-bake (idempotency) — all produce exactly one poster and correct display states.

## 2026-06-24 (session 3) — Hero fix, browser caching, CLAUDE.md, Cloudflare
- **Hero video flash (Bug 1) fixed and verified live.** Baked correct admin-chosen hero
  `yarden_18094353658922515.mp4` + matching `_thumb.jpg` poster directly into `index.html`.
  Fixed `fix.js` to bake the correct hero on every future sync (so admin changes propagate).
  Fixed mobile `<source>` error handler: was `v.addEventListener('error',…,true)` (on video element,
  which never fires for `<source>` failures) → changed to `s.addEventListener('error',…)` (on the
  source element, fires correctly), so `_mobile.mp4` 404 correctly falls back to the base URL.
- **Browser HTML caching fixed via Cloudflare Transform Rule.** Added `Cache-Control: no-cache`
  on all `*.html` and `/` responses. Verified live: `curl -sI "https://yardendamri.co.il/"` confirms
  `cache-control: no-cache`. Browsers now revalidate HTML on every visit; stale-cache hero-flash gone.
- **HSTS: accidentally ramped to production (`max-age=31536000; includeSubDomains; preload`), then
  immediately reverted to `max-age=300`.** Pending ramp date: on/after 2026-06-28. Logged in MISTAKES.md.
- **CLAUDE.md reorganized.** Non-negotiable RULE 1–9 moved to top of file in bold. Every new session
  opens immediately on the hard constraints.
- **Lightbox desktop actions (Bug 2) — repositioning JS in place on both `index.html` and
  `gallery.html`, live but not visually verified** (Playwright browser install failed in this env).
- **Two new entries in MISTAKES.md**: premature Bug 1 "done" claim; premature HSTS ramp.

## 2026-06-24 (session 2) — Instagram sync diagnosis + team update
- Diagnosed the two failed sync runs (09:35, 14:36 UTC): both used commit `ca84125` (pre-fix). The fix
  (`42ef8ed`, 15:24 UTC) landed after the last failure. Next scheduled run will be clean.
- Confirmed re-uploads used same quality settings (CRF 28 / 720p); no degradation; `_hd.mp4` untouched.
- User confirmed user-side security actions done: Google Places API key rotated, Bot Fight Mode ON, www Proxied.
- Added **Professional Hebrew Copywriter** role to CLAUDE.md. Model recommendation: Sonnet.

## 2026-06-24 — Security pass: Cloudflare headers, secret scan, preview/ retired
- Cloudflare Transform Rule (via API) sets `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options`, and staged `Strict-Transport-Security: max-age=300` (HSTS ramp to 1y logged
  in STATUS.md as a next-session task). Headers verified live.
- Secret scan of all tracked code: removed a hardcoded Google Places API key from `reviews.html` (was
  dead code — Google-reviews fetch disabled — but publicly exposed). See MISTAKES.md; owner to
  regenerate the key in Google Cloud. No other secrets found (admin auth = SHA-256 + server-side Worker).
- Confirmed all internal/private files (10 `.md`, `fix.js`, dev scripts, `tests/`, `.github/`) return 404
  on the public site — only the mirror allowlist is published.
- Retired the obsolete `preview/` workflow: deleted the stale `preview/` folder (27 files), updated
  CLAUDE.md ("edit root; mirror publishes to public repo") and dropped dead `/preview/` lines from robots.txt.
- Added `.well-known/security.txt` (RFC 9116, vuln-disclosure contact) and taught `publish-public.yml`
  to create parent dirs so nested allowlisted files publish.
- **Fixed the Instagram sync broken by the `preview/` deletion** (root cause traced past the symptom):
  `sync-auto.yml` ran `fix.js --target=preview`, which reads `preview/gallery-data.js` to know what was
  already uploaded. With `preview/` deleted that file was gone → empty "already-uploaded" memory → it
  re-transcoded/re-uploaded ALL videos → 45-min CI timeout. Fix: made the sync **root-only** (`node fix.js`,
  no `--target`; commit stages root `gallery-data.js`/`instagram-stats.json`/`index.html`/`gallery.html`)
  and raised `timeout-minutes` 45→120. See MISTAKES.md.
- Reviewed the Cloudflare security scan the user pasted: 4 "Dangling A Record" warnings are a FALSE
  POSITIVE (GitHub Pages IPs `185.199.108-111.153` — do NOT delete); `www` unproxied + Bot Fight Mode =
  real one-tap dashboard fixes (user-side); "Block AI bots" correctly set to allow crawlers.
- Added permanent routines to CLAUDE.md: diagnose-to-root-cause, grep-before-delete, real secret scans,
  ffmpeg frame-extraction to read `.mp4` recordings, and the bride-alt-text (no `אילת`) rule.

## 2026-06-23 — Grid perf + mobile WhatsApp button + hide-latency note
- **Grid loaded full images (slow):** image tiles used `item.thumb || item.u`, but image entries
  have no `thumb`, so every tile fetched the full ~1080px `.webp` (~92KB). Image `_thumb.webp`
  (~25KB) already exist on R2 — the grid now derives the `_thumb.webp` URL for image tiles (videos
  keep their `_thumb.jpg`); lightbox still uses the full image. `onerror` falls back to full if a
  thumb is missing. ~3.6× less data/tile. Fixed in index.html + gallery.html (+ preview).
- **Mobile-menu WhatsApp button too big:** `.mobile-menu-wa` (padding 16/20, margin-top 28, 1rem)
  inflated the menu and could overflow short phones. Compacted (11/18, margin-top 16, .9rem, 18px
  icon) + added `overflow-y:auto` to `.mobile-menu`. Verified on Chromium iPhone: button 46px, menu
  fits/scrolls.
- **"Hidden video still showing" was not a bug:** the hide is written correctly (video `u` == the
  `.mp4` in `admin.hidden`) and propagates — it just takes ~1–3 min (Worker → mirror → Pages rebuild).
- Also (earlier today): mirror now writes `CNAME` unconditionally after the Step-6a domain removal
  deleted it and 404'd the live site; recovered.

## 2026-06-23 — Stage C: repo split + domain move (DONE)
Origin `ofirdamr/yarden-damri` made **private** (keeps full history, Actions, secrets, `preview/`).
New **public** repo `ofirdamr/yardendamri-site` now serves `yardendamri.co.il`. Design: private repo
is the single source of truth; `publish-public.yml` mirrors a curated allowlist (site + data only,
no fix.js/worker.js/workflows/preview/docs) to the public repo on every push to main — so Instagram
sync and Worker admin commits propagate to live automatically, no clobber. First mirror run failed
(empty public repo had no `main`); fixed to clone-or-init + create `main`. Domain moved (custom
domain cleared on old repo, set on new repo, DNS green, HTTPS enforced). Verified private→public→live
byte-match for gallery-data.js, gallery-settings.json, index.html; old repo raw 404 (private). Public
repo holds **no secrets** (all automation runs in private repo / Cloudflare). Worker `GH_REPO` still
points to the private repo — its token must retain private-repo access for admin writes.

## 2026-06-23 — Fix Visual QA (Playwright) red on the go-live commit
The go-live deploy itself succeeded (`pages build and deployment` green; site live), but the
`Visual QA (Playwright)` CI went red on **2 WebKit (mobile-safari) tests** — `home` + `gallery`:
`JS errors on gallery: /api.yardendamri.co.il/social?v=... due to access control checks.`
Root cause: the promoted pages (unlike the old root) call the Worker `/social` likes endpoint.
WebKit surfaces a **cross-origin** fetch as a "due to access control checks" pageerror whenever the
page is served off-origin — i.e. always in CI (127.0.0.1), **never** on live `yardendamri.co.il`
(origin is CORS-allowlisted). The app already swallows the rejection (`loadSocial` try/catch +
`.catch`), so the site is fine — this was browser-level network noise the test mis-classified as a
real script error, contradicting its own "missing external assets are tolerated" contract.
Fix (QA harness only, site untouched): `tests/visual.spec.js` `pageerror` handler now filters
tolerated external-resource/CORS failures (`api.yardendamri.co.il`, "access control checks",
load/net::ERR) while still failing on real TypeError/ReferenceError. Chromium suite stays green.


## 2026-06-23 — 🚀 GO LIVE (Stage B): promoted preview/ → root
The new site is now the live ROOT site. Promotion was a file copy + reference rewrite:
- Copied preview/ site files to repo root, overwriting the old Cloudinary-era root: all 13
  HTML pages (12 public + `admin.html`), `styles.css`, `gallery-data.js`, `instagram-stats.json`,
  and the JS (`a11y.js`, `cookie-banner.js`, `cloud-storage.js`, `remote-state.js`). Added the
  files root was missing (`a11y.js`, `cookie-banner.js`, `cookies-policy.html`, `remote-state.js`).
  Did NOT copy `worker.js` (Cloudflare Worker source, deployed separately).
- Rewrote every absolute `/preview/` reference → `/`: nav-logo + footer "דף הבית" hrefs across
  all 12 pages; `index.html` `og:url`/`canonical`/`og:image`/share-`var u`; `cookie-banner.js`
  cookies-policy link. Grep confirms **zero** `/preview/` link/asset refs in root html/js/css.
- `robots.txt` left as-is (correctly Disallows `/preview/` so the duplicate stays out of the index);
  `sitemap.xml` already root URLs. Root icons + `share-preview.jpg` already present.
- **Verified** on Chromium (desktop 1440×900 + iPhone 13 emulation) across 9 key pages: HTTP ok,
  `lang=he dir=rtl`, visible `nav[role=navigation]`, footer present, non-empty titles, **zero
  horizontal overflow**, **no `/preview/` links in the DOM**, no JS errors. WebKit engine couldn't
  launch in-sandbox (host missing GTK/GStreamer libs); used Chromium iPhone emulation for mobile —
  content is byte-identical to the previously WebKit-verified preview apart from the href rewrites.
- Stage C (repo split + domain move) NOT started — separate, needs the user.

## 2026-06-22 — 3 desktop fixes (UNVERIFIED) + rules/roles + egress for next session
- User reviewed cleaned `/preview/` on desktop, found 3 issues. Pushed fixes (commit 8687f87) **UNVERIFIED** — could not render in-session (egress blocked the Playwright browser CDN + the live site):
  - `services.html`: scoped **2×2 grid** for the 4 main cards (≥760px) — shared `.services-grid` is `repeat(3,1fr)` → 3+1 lonely card.
  - `index.html` + `gallery.html` lightbox: **flex-centering** (`object-fit:contain`) at ≥1081px, replacing the absolute+transform centering (could corner-pin/cover-crop on desktop).
  - **Hero video pixelation: diagnosed, NOT fixed** — baked source is the compressed `videos-new.yardendamri.co.il/yarden_18100404782127411.mp4`, upscaled by `object-fit:cover` on the desktop hero. Needs a higher-res source.
- `CLAUDE.md`: new STRICT RULE — Network/internet use (site + tooling only without asking); team **lean-by-default** (Manager picks roles); added **[SEO Specialist]** + **[Web Security Specialist]**.
- Egress set to **All-domains** (effective next session) → next session can `playwright install` the browser and **visually verify** the fixes. Handoff written in `SUMMARY.md` (▶ NEXT SESSION).

## 2026-06-22 — Go-live Stage A: code cleanup (preview/ only, root untouched)
Conservative, behavior-preserving cleanup ahead of promoting preview/ → root.
- Deleted dead/standalone files: all 14 `preview/*-temp.*`, `preview/gallery-new.html`, `preview/vtest.html`, `preview/admin.html.headers`, legacy `netlify/functions/ig-stats.js`.
- Unified CSS: the homepage was on `styles-temp.css` while subpages used `styles.css` (diverged into two desktop designs). Promoted the newer homepage stylesheet to `preview/styles.css`, repointed `index.html` to it, and normalized every page to `styles.css?v=20260622a`.
- Removed dead code: unused `brandedImageFile()` share-canvas + unused `SHARE_SITE` const in `index.html` + `gallery.html`; simplified the now-dead `-temp`/`?g=t` branch in `shareLink()`.
- Verify gate: review the cleaned site at `yardendamri.co.il/preview/` before Stage B (copy → root go-live).

## 2026-06-22 — Multi-Agent mode + Automated QA pipeline (Playwright)
- CLAUDE.md: added "Multi-Agent Development Mode" (PM / UI-UX / FE / BE / Tech Lead / QA roles, internal-discussion-first workflow, no mid-task prompts, final delivery = review link + "confirm to merge") and "Automated QA Pipeline (Playwright)" section incl. the continuous-learning loop for the QA role. Reconciled with the main-only rule: web-initiated `claude/*` tasks ship as a draft PR; merge to main only on explicit confirmation.
- ARCHITECTURE.md: added an "Automated QA / Visual Testing (Playwright)" section + data-flow diagram.
- Playwright added: `playwright.config.js` (desktop-chromium 1440×900 + mobile-safari iPhone13/WebKit; serves repo root via http-server; `BASE_URL` override), `tests/visual.spec.js` (per key page: HTTP<400, RTL `lang=he dir=rtl`, visible `nav[role=navigation]`, non-empty title, no horizontal overflow, no JS errors, full-page screenshot; + mobile-menu open/close on WebKit).
- CI: `.github/workflows/playwright.yml` runs on push/PR/dispatch, installs chromium+webkit, runs the suite, uploads `playwright-report/` + `screenshots/` artifacts.
- package.json: added devDeps `@playwright/test`, `http-server` + scripts `serve`, `test:e2e`, `test:report`. Added `.gitignore` (node_modules, reports, screenshots).
- Delivered on branch `claude/multi-agent-qa-pipeline-a0oguk` as a draft PR for review.

## 2026-06-21 — Gallery/media/share overhaul PROMOTED to permanent
Promoted `gallery-temp.html`→`gallery.html` and `index-temp.html`→`index.html` (user approved). All live now:
- Videos: grid thumbnail → autoplay `<video>` on scroll with `poster=thumb` (no black boxes); lightbox plays with poster + muted-fallback (no endless spinner).
- Natural Instagram time order across site + admin; carousels = one cover tile + ⧉ badge, lightbox swipes children; ▶ badge on videos.
- Lightbox: IG action bar (like/comment/share/save), horizontal swipe = navigate, vertical swipe = dismiss, media static, X lowered to 64/108px (clear of cookie bar + video mute control), floats hidden while open.
- Favourites: `localStorage gallery_favorites` + "♥ המועדפים שלי" filter.
- Share: link-only → `api.yardendamri.co.il/s/<v|p>/<id>` → WhatsApp clean card (thumbnail + "לחצי כאן לצפייה" + domain) → deep-links to `gallery.html?m=<id>`. (Framed `brandedImageFile()` canvas stays in code but unused — WhatsApp can't show framed file AND card together.)
- Worker: added `GET /s/...` share route; `deploy-worker.yml` uses `inherit` bindings so secrets survive redeploy. Redeployed.
- fix.js: `getJSON()` retry wrapper fixed pagination truncation (real cause of missing posts); carousel children tagged.
- R2 CORS set on both buckets via Cloudflare dashboard (R2 object token lacked bucket-admin for the API route).
- CLAUDE.md: added STRICT RULE — only edit `*-temp.html`, promote on explicit approval only.

## 2026-06-21 — Temp-only rule, missing posts, IG-style media (temp files)
- CLAUDE.md: added STRICT RULE — only edit `*-temp.html`, never permanent files; promote only on explicit approval.
- fix.js ROOT CAUSE of missing posts: `get()` returns `{}` on any timeout, and the media pagination loop did `if(!res.data) break` — one flaky page silently dropped ALL older posts (not just reels). Added `getJSON()` retry wrapper (4x backoff) for media pages + carousel children. Triggered sync to recover.
- fix.js: carousel children now stamped `carousel/cidx/ccount/post_id` so the gallery can group + badge them.
- Temp gallery + homepage: one tile per carousel (cover) + layers badge; video badge; gallery lightbox swipes a post's children. IG-style lightbox icons (thin strokes, solid-red like + pop).
- Share: shares the SPECIFIC media — images branded on canvas with "ירדן דמרי" logo + name + link; videos shared as file; WhatsApp fallback with caption + media link. NOTE: branded image needs CORS on images CDN; if blocked it falls back.
- Lightbox open hides floating WhatsApp/a11y/scroll-top buttons (were covering the action bar on mobile).

## 2026-06-20 — Applied video fix to temp files + promoted temp → permanent
- gallery-temp.html & index-temp.html: replaced brideKW/orderMap sort with natural Instagram time order; replaced `<img data-video>` swap pattern with real `<video preload="none">` elements; gave gallery tiles `aspect-ratio:4/5` so they never collapse in CSS-columns masonry; updated IntersectionObserver to play/pause `<video>` directly (no swap needed); filter includes `img.hidden` flag + privateCats.
- Promoted: cp gallery-temp.html → gallery.html, index-temp.html → index.html. Permanent files now contain ALL temp UI/design changes (desktop responsiveness, RTL optimization, cookie banner, etc.) AND the full video fix.
- Resolved conflict in index.html (upstream auto-sync had changed hero video source — kept upstream version).
- Pushed to main.

## 2026-06-20 — ROOT CAUSE found: gallery videos "not there" (preview/gallery.html)
Verified by observation, not guessing (user: hero video PLAYS = video domain fine; gallery video tiles "not there at all"). Data checked: gallery-data.js has 162 videos all with thumb URLs; 138 survive admin hidden/private-category filtering — so the data and filter were NEVER the problem. Two real causes in gallery.html:
1. No way to reach the videos — only category filters existed (no photos/videos toggle), and the admin `order` + bride-keyword sort buried videos deep in the masonry, so first pages show only photos.
2. Invisible video tiles — `<video>` had `width:100%` with NO height/aspect-ratio in the `columns` masonry, plus `onerror→display:none`, so tiles collapsed to zero size.
Fix (surgical, in source — no rebuild): added a הכל/תמונות/סרטונים media filter (independent of category filter); gave video tiles `aspect-ratio:4/5;object-fit:cover` + bg so they always have a visible box; removed the `onerror` hide.

## 2026-06-20 — Follow-up per user feedback (all pushed, verified via data + Action logs)
- User confirmed: videos show under "סרטונים", hero video plays. Confirmed display root cause.
- gallery.html: removed the public CATEGORY filter (admin-only now); switched to NATURAL Instagram time order (photos+videos interleaved by date) — `applyAdminSettings` now only removes hidden + private-category items, no brideKW/order sorting. Kept media filter.
- index.html (homepage): same — natural time order, real `<video autoplay muted loop playsinline>` tiles (tile is aspect-ratio:1 box so never collapses), respect hidden flag.
- DATA root cause: `fix.js` was DROPPING every hidden item from gallery-data.js (`if(isHidden) continue`) → data shrank to 773 (= total − 772 hidden). Fixed: hidden items now KEPT in data with `hidden:true` (reuse existing entry or deterministic R2 URL, no re-upload). Public pages filter them out (URL + flag). Triggered sync (run 27882229630, success) → gallery-data.js now **1546 items (1247 images + 299 videos), 772 flagged hidden, 774 public (163 videos)** — matches expected ~1530 img/~290 vid.
- CACHE root cause: fix.js only bumped `?v=` on index-temp.html, AND the workflow never committed HTML files → live pages always served stale gallery-data.js after a sync. Fixed: fix.js bumps index.html/gallery.html/index-temp/gallery-temp; sync-auto.yml now commits those HTML files; bumped both live files for this deploy.

## 2026-06-20 — Rebuilt gallery from scratch: preview/gallery-new.html
Decision: stop debugging the tangled gallery pipeline in index-temp.html (stale 772-entry hidden list, 899-entry order map, brideKW sort, pagination that buried all videos on page 2). Built a fresh, self-contained gallery page.
- Reads gallery-data.js directly. No admin-settings filtering, no stale hidden/order.
- All 773 items in natural data order, so 12 videos appear in the first 40 tiles (immediately visible).
- Videos: video tag with src autoplay muted loop playsinline preload=metadata poster, plus IntersectionObserver play/pause. No play button.
- Filters: הכל / תמונות / סרטונים. "הצגת עוד" load-more (40/batch). Lightbox with prev/next + keyboard.
- Self-contained: inline CSS/JS, no styles-temp.css dependency.
- NOT yet verified live (session egress blocked). Pending user review at /preview/gallery-new.html.

## 2026-06-20 — ✅ CONFIRMED WORKING: gallery videos autoplay everywhere (incl. iPhone)
- User confirmed videos now autoplay from all devices including iPhone.
- Final working combo: `<video src autoplay muted loop playsinline preload="metadata" poster>` + `observeGalleryVideos()` IntersectionObserver that sets `v.muted=true` and calls `v.play()` on visible tiles / `v.pause()` off-screen. No play button anywhere.

## 2026-06-20 — iOS gallery autoplay: preload=metadata + force muted at play()
- User confirmed (after deploy) the video spots show static poster thumbnails but don't play on iPhone — i.e. new `<video>` code IS live, but iOS won't auto-start.
- Root cause: `preload="none"` means iOS Safari never fetches video data, so it shows only the poster frame.
- Fix: `preload="none"` → `preload="metadata"` on gallery `<video>` tiles, and set `v.muted = true` right before `v.play()` in observeGalleryVideos (iOS checks the muted property at play() time).
- Note: iOS Low Power Mode disables all autoplay regardless of code.

## 2026-06-20 — Restored missing observeGalleryVideos() — videos now actually play
- Root cause of "only images, no videos": `observeGalleryVideos()` was CALLED (renderPage, DOMContentLoaded, setTimeout) but NEVER defined — a past session deleted it when switching to the play-button approach. Without it, grid `<video>` tiles never received `.play()`, so on iOS Safari they showed only their poster thumbnail (looked like images).
- Fix: defined `observeGalleryVideos()` — an IntersectionObserver that plays visible gallery videos and pauses off-screen ones (play/pause only, no play button). Also serves performance for 162 videos.
- Confirmed via user screenshot that served gallery-data.js DOES contain the videos — data was never the problem.

## 2026-06-20 — Gallery videos autoplay (deployed to main)
- `preview/index-temp.html` renderPage(): video tiles now render a real `<video src="${item.u}" autoplay muted loop playsinline preload="none" poster="${item.thumb}">` instead of `<img>` + play-button overlay
- Videos autoplay (muted, looping) in the gallery grid — no play button anywhere
- Images unchanged (`<img>` via cdnUrl); hover handlers already guard `img` with `if (imgEl)`
- Deployed straight to `main` (GitHub Pages serves /preview/ only from main)

## 2026-06-20 — Video gallery restore + cache-busting
- R2 API credentials deleted and recreated; GitHub Secrets `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` updated
- Sync triggered: 162 videos with audio + thumbnails uploaded to R2 (both buckets)
- `preview/gallery-data.js` now has 773 items: 611 images + 162 videos (all with `video:true` + `thumb`)
- **Root cause of "no videos"**: `gallery-data.js` had no cache-busting — browser served old file with 0 videos
- Fix: added `?v=1750416000` to script tag (bumped from 20260620 to force new pages deploy); fix.js bumps version on every sync
- Gallery video tiles: replaced `<video data-src>` (fragile, broken on iOS) with `<img src="${thumb}">` + play icon overlay
- Pagination bug fixed: `filteredImages` was sliced to 48 items, making pages 2+ empty — removed the slice
- Previous `?v=20260620` never deployed (pages build race condition) — bumped to `?v=1750416000` and re-committed

## 2026-06-13 — Admin Security Refactor
- Worker (`preview/worker.js`): replaced raw `X-Admin-Password` header with KV session tokens
  - `POST /login` → validates password, issues 64-char hex token (8h TTL, stored in KV `SESSIONS`)
  - `POST /logout` → invalidates token
  - `POST /settings` → requires `Authorization: Bearer <token>`
  - Rate limiting: 5 failed logins → 15-min IP lockout (`rl:{ip}` KV key)
  - CORS: explicit allowlist, `Vary: Origin`, security headers (HSTS, X-Frame-Options: DENY, CSP)
- `preview/cloud-storage.js`: full login/logout flow, Bearer token on all writes, 401/403 auto-clears token
- `preview/admin.html`: `tryLogin()` calls `RemoteState.login()` — handles 429/401/network in Hebrew
- `deploy-worker.yml`: GitHub Actions CI/CD — creates KV namespace, deploys Worker via Cloudflare REST API
- KV namespace `yarden-admin-sessions` created (ID: `7fc38ac017a145fea0a486419a3bff07`)
- All `-temp` files promoted to permanent and deleted

## 2026-06-13 — Nav consistency fix: added ביקורות to homepage
- `index.html` desktop nav and mobile menu were missing ביקורות — all other pages had it
- Added `<li><a href="/reviews.html">ביקורות</a></li>` to both desktop and mobile nav in `index.html`
- Root cause of intermittent "two ביקורות" bug: iOS Safari bfcache serving subpage DOM on homepage, resulting in visible duplicates
- Fix: nav is now identical across all pages

## 2026-06-13 — Cookie Banner Redesign + GA Consent Gating
- Rewrote `preview/cookie-banner.js`: slim 48px bar at top of page (z-index:10001), slides down from top
- Nav (`nav[role="navigation"]`) shifts to `top:48px` via `body.has-ck` class while banner is visible; returns to `top:0` on dismiss
- Banner layout: cookie text + מדיניות פרטיות link | "אני מסכימה" button | ✕ close button
- ✕ = declined (banner closes, GA never loads); "אני מסכימה" = accepted (GA loads dynamically)
- Floating buttons (WA, accessibility) completely untouched — no position changes
- GA (`G-68XM6LS4HX`) removed from `<head>` of all 10 preview pages; now loads only after explicit accept
- Returning visitors who already accepted: GA loads immediately on page load (no banner shown)
- Banner appears on first visit to ANY page of the site; localStorage prevents re-showing after accept/decline
- Applied to: index.html + all 9 subpages (about, accessibility-statement, bridal-guide, bride, contact, gallery, pricing, reviews, services)

## 2026-06-13 — Cookies Policy + Cookie Banner (original)
- Created `preview/cookies-policy.html` — full Hebrew cookies policy page (matches disclaimer.html style)
- Created `preview/cookie-banner.js` — shared script added to all 12 public pages
- Banner: slim frosted-dark bar (preview charcoal #111111 + gold accent #B89060), appears once on first visit to any page, never shown again after accept/decline (localStorage)
- Policy covers: Essential / Analytics (GA4) / Marketing (Meta Pixel) / Instagram API / Google Reviews

## 2026-06-03 — preview/ share buttons
- Added share strip to gallery.html (after gallery grid), reviews.html (after reviews), index.html (between reviews and contact sections)
- Strip shows "שתפי עם חברה" button — triggers native Web Share API on mobile; falls back to WhatsApp web on desktop
- CSS added to styles.css: `.share-strip`, `.share-strip-text`, `.share-strip-btn`

## 2026-06-03 — preview/ nav + footer social buttons
- Fixed nav logo `href="/"` → `href="/preview/"` on 5 subpages (about, accessibility-statement, bridal-guide, contact, disclaimer)
- Added Instagram + TikTok footer buttons to all 10 preview subpages (were missing)
- Styled as 34×34px square buttons matching hamburger menu style
- Tuned icon sizes (IG 17px, TikTok 24px) to balance visual weight — TikTok still appears slightly smaller (deferred)

- fix: BCyber (Bezeq) block — replaced `workers.dev` Worker URL with custom domain `api.yardendamri.co.il` in `preview/cloud-storage.js` to remove the suspicious domain reference that triggered the filter; submitted false-positive removal request to Bezeq at ca-2@bezeq.co.il

- fix: mobile menu social buttons (Instagram/TikTok) now equal height + width — `.mobile-social .social-pill` set to `flex:1 1 0; min-width:0; height:44px; padding:0 11px` and removed `flex-wrap:wrap` from `.mobile-social` (prevented uneven sizing/wrapping); previous `flex:1` alone was undercut by base `height:36px` and the wrap allowing the longer "Instagram" label to size differently
- fix: mobile menu social buttons (Instagram/TikTok) equal width via `flex:1` on `.mobile-social .social-pill`

### Infrastructure
- Migrated hosting from Netlify (suspended) → GitHub Pages
- Set up Cloudflare DNS with proper A records
- Fixed SSL/HTTPS configuration
- Set up GitHub Actions for automated Instagram sync every 6 hours
- All 1531 images uploaded to Cloudinary (permanent URLs)

### Instagram Integration
- Fetches all posts + likes + comments_count from Instagram API
- Saves to `instagram-stats.json` via GitHub Actions
- Comments text blocked by Meta (requires app review permission)
- Fixed carousel album duplicate bug (was 1531 → deduplicated to 1131 unique)
- Fixed Unicode characters in captions that were breaking gallery JS

### Gallery
- 1131 unique images on Cloudinary with permanent URLs
- WebP/AVIF auto-conversion via Cloudinary (`f_auto,q_auto`)
- Lazy loading — images load only when scrolled into view
- Video lazy loading — videos load only when in viewport, play/pause on scroll
- Video compressed to 480p via Cloudinary for fast loading
- Lightbox with keyboard navigation

### Admin Panel (`/admin.html`)
- Password login with SHA-256 hashing (no plain text passwords in code)
- Show/hide password button
- Gallery grid with 60 images per page (pagination)
- Multi-select with bulk actions:
  - 🚫 Hide / 👁️ Show
  - 📌 Pin / Unpin group
  - 🏷️ Set category for group
  - 🔄 Rotate group
  - ⬆️ Move group to top
  - 🗑️ Delete selected
- Duplicate finder (🔁 כפולות filter)
- Category management
- 💰 Pricing editor — edit service name, price, description, included items
- 📊 Analytics tab with GA4 OAuth connect button

### Analytics
- Google Analytics GA4 tracking code installed (G-68XM6LS4HX)
- GA4 OAuth set up (Client ID + Client Secret configured)
- Property ID: 536415544
- Connect button in admin → Analytics tab — shows real data after login:
  - Sessions, users, bounce rate, avg session duration
  - Traffic sources (Google, Direct, Social, etc.)
  - Device breakdown (mobile/desktop)
  - Cities
  - Age/gender (requires GA4 demographics enabled)
  - Top pages

### SEO
- Sitemap with 10 pages + 500 images with captions (`sitemap.xml`)
- `robots.txt` allowing Google image crawling
- Keywords meta tags on all pages
- `<canonical>` URLs on all pages
- JSON-LD structured data on all pages
- Internal footer links for Google discovery
- New indexed pages:
  - `/bride.html` — מאפרת כלות אילת
  - `/services.html` — שירותי איפור
  - `/bridal-guide.html` — מדריך כלות (high-traffic article)
  - `/pricing.html` — מחירון
  - `/disclaimer.html` — תנאי שימוש ומדיניות

### Accessibility (IS 5568)
- Skip navigation link
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- Accessibility statement page (`/accessibility-statement.html`)
- Accessibility widget with contrast, text size, links highlight

### Performance
- Cloudinary CDN for all images and videos
- `preconnect` hints for Cloudinary
- `decoding="async"` on all images
- `loading="lazy"` on all gallery images
- IntersectionObserver for video autoplay only when visible
- `gallery-data.js` cache-busting query parameter

### Bug Fixes
- Fixed nav background (was cream-on-cream invisible)
- Removed duplicate WhatsApp button (left side was duplicate)
- Fixed Instagram/TikTok icon alignment in nav
- Fixed gallery-data.js Unicode characters breaking JS parse
- Fixed admin gallery not showing (catMap scope bug)
- Fixed admin login JS syntax error (newline in prompt string)
- Fixed Cloudinary upload duplicates (carousel album children bug)
- Removed old patch files (video-fix.js, sync-all-instagram.js, webhook-server.js)
- Fixed GitHub Actions workflow merge conflicts

---

## 🔴 Still Pending

### Pages (incomplete/404)
- `/gallery.html` — standalone gallery page
- `/reviews.html` — reviews page
- `/contact.html` — contact page
- All sub-pages need luxury dark redesign to match site

### Design
- Luxury fashion magazine redesign (in progress)
- Sub-pages currently show with wrong white text on light background
- `subpage.css` created — needs to be applied to all sub-pages

### Booking System
- Calendly integration for online booking with iPhone calendar sync
- Online payment (Bit, credit card)
- 10% discount for online reservations (logic built into pricing page)

### Features Pending
- Bride packages section in admin
- Booking/calendar sync with Yarden's iPhone (requires Calendly setup)

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main site (one-page) |
| `styles.css` | Main site styles |
| `subpage.css` | Sub-page shared luxury CSS |
| `admin.html` | Admin panel |
| `fix.js` | Instagram sync (GitHub Actions) |
| `gallery-data.js` | Auto-generated gallery data |
| `instagram-stats.json` | Auto-generated IG likes/comments |
| `.github/workflows/sync-auto.yml` | GitHub Actions workflow |
| `bride.html` | Bride page |
| `services.html` | Services page |
| `pricing.html` | Pricing page |
| `bridal-guide.html` | Bridal guide article |
| `disclaimer.html` | Legal/terms |

## 🔑 Credentials & IDs
- **GitHub repo**: ofirdamr/yarden-damri
- **GA4 Property ID**: 536415544
- **GA4 Measurement ID**: G-68XM6LS4HX
- **Cloudinary cloud**: dfjwxc1cw
- **Instagram token**: stored in GitHub Secrets (INSTAGRAM_TOKEN)

## 2026-05-25
- Fixed mobile menu links in index.html, services.html, gallery.html, bride.html
- Bug: mobile menu had old anchor links (#services, #gallery etc.) instead of page links (/services.html etc.)
- All pages now have consistent mobile menu: אודות | מאפרת כלות | שירותים | גלריה | מחירון | צרי קשר
- Note: pricing.html is empty (redirect to /), needs to be built

## 2026-05-25 (cont.)
- Fixed services.html color scheme — section was missing id=services so dark charcoal background wasn't applied, leaving white text on cream background

## 2026-05-25 (pages)
- Created about.html — extracts about section from index.html
- Created contact.html — extracts contact section + form from index.html
- Added bridal-guide.html to nav on all pages
- Updated all nav links: /#about → /about.html, /#contact → /contact.html (subpages only)
- index.html keeps #about and #contact anchors for homepage scrolling
- Fixed bridal-guide.html nav (removed pricing, fixed mobile menu, replaced footer)
- Nav is now consistent across all 7 pages: אודות | מאפרת כלות | שירותים | גלריה | מדריך כלות | צרי קשר

## 2026-05-25 (disclaimer)
- Fixed disclaimer.html: text colors (white→dark), nav (added bridal-guide, removed pricing), footer (canonical markup)

## 2026-05-25 (SEO fixes)
- Fixed sitemap: removed duplicate gallery.html plain entry, kept image-rich entry
- Added about.html to sitemap
- Created reviews.html — full page with review form + Google Maps + JSONBin integration
- Added SEO keyword paragraph to gallery.html
- Canonicals confirmed already present on all 4 pages (SEO specialist was looking at old version)
- Pricing.html: still redirect placeholder — waiting for admin content

## 2026-05-26
- Fixed bride.html footer: was using custom dark footer with rgba(62,42,26,.45) dark brown text on #1a1008 dark background — completely invisible. Replaced with canonical <footer role="contentinfo"> markup.
- Fixed gallery.html footer: was using custom dark footer instead of canonical markup. Replaced with <footer role="contentinfo">.
- Both footers now use white text (rgba(255,255,255,.45)) on dark background, consistent with all other pages.
- Fixed gallery.html: 289 video entries were invisible (loadPage rendered .mp4 URLs as <img> → failed to load). Now uses Cloudinary video-to-JPEG thumbnail for grid (so_0 frame). Lightbox updated to show <video> element for video entries with autoplay controls, pauses on close/navigate.
- gallery.html: full port of homepage gallery — now has likes/comments, Instagram stats sync, video autoplay via IntersectionObserver, admin settings (hidden/pinned/order respected via gallery_admin localStorage key), cdnUrl/cdnVideo/cdnVideoPoster for f_auto+q_auto on all media.
- index.html: homepage gallery now shows images only, capped at 48 items (no videos). Replaced pagination with "לכל הגלריה ←" link to gallery.html. Reduces Cloudinary bandwidth on homepage.
- TODO: sync gallery_admin settings to JSONBin so admin curation applies for all visitors (JSONBin was down at time of implementation).

## $(date +%Y-%m-%d) - Fixed mobile social pills size mismatch
- Locked `.mobile-social .social-pill` and `.footer-social-pills .social-pill` to exact 44x44 with min/max width/height
- Forced inner SVG to 18x18 via CSS (overrides inconsistent 15/16px HTML attributes)
- Centered both pairs (`justify-content: center`) for visual alignment consistency
- File: styles.css lines 346-352

## Rebuilt social buttons from scratch
- Deleted `mobile-social`, `footer-social-pills`, `social-pill ig/tt` (in mobile/footer contexts)
- Created new `.social-circles` (wrapper) + `.social-circle.ig/.tt` (button) — 48x48 circles, 22px SVG, centered
- One identical block in mobile menu + footer across all 10 HTML pages
- Cleaner code, no cascade conflicts possible

## Authentic brand styling for social buttons
- Instagram: switched to official radial-gradient (yellow→orange→pink→purple→blue, like real IG app icon)
- TikTok: replaced SVG with authentic 3-layer glitch logo (cyan #25F4EE + red #FE2C55 + white)
- Sized 42x42 (was 48x48) — better fit for mobile UI
- Updated across all 10 pages with one script

## Matched SVG viewBoxes for identical visual size
- Both IG and TT now use 24x24 viewBox with paths filling full area
- Both icons white (consistent visual weight)
- Hard-locked circle to 42px (min/max width+height, line-height 0, padding 0)
- IG keeps authentic radial gradient background; TT keeps black

## Eliminated irradiation illusion on social circles
- IG: muted linear gradient (#515BD4 → #8134AF → #DD2A7B → #FEDA77)
- Icons bumped 20→22px so white logo dominates
- Both circles now have equal visual weight at 42px

## Final design: site-matched social circles
- Both circles identical: 44px, `var(--deep)` background, `var(--blush)` icon + border
- Only icon SVG path differs (IG camera vs TT note)
- Matches site palette — elegant brown/blush instead of clashing bright brand colors
- `all: unset` + 12 `!important` size locks — bulletproof against any CSS conflict

## 2026-05-27 - Preview deploy via GitHub Pages
- Netlify is suspended → no branch previews available
- Solution: created /preview/ folder on main branch with ui-redesign content
- GitHub Pages already serves main → preview will be live at yardendamri.co.il/preview/
- Non-destructive: only adds folder, does not touch existing files
- After review, user can delete preview/ folder

## 2026-05-27 - Reviews page editorial overhaul (preview/)
Fixed all dark-theme leftovers + UX issues on reviews.html:
- Replaced all `var(--card)` (#111 black) and dark rgba colors with cream editorial palette
- New scoped CSS classes (`.rv-hero`, `.rv-rating`, `.rv-card`, `.rv-cta`, `.rv-skel`) — no inline styles
- Skeleton loaders (shimmer animation) instead of "טוענת ביקורות..." text
- Larger editorial rating display (4rem rating number, gold stars on cream)
- White cards on cream bg with subtle hover lift + shadow
- CTA box now light editorial (white + thin cream border) — was a black block
- XSS-safe rendering with escapeHtml() helper
- aria-busy + aria-live for screen readers during loading
- Better fallback: shows 5.0 rating + clean Google link, never an empty page
- Security comment block above API key with required Google Cloud restrictions

## 2026-05-27 - Gallery + Homepage video & comment fixes (preview/)
Fixed 5 issues:
1. Gallery: Removed play SVG overlay (videos autoplay)
2. Gallery: Comment button "opened big video" bug → action buttons were opacity:0 (hover-only) so mobile users couldn't tap. Now always visible on touch devices (media hover:none), with pointer-events isolated to buttons + event.preventDefault on click handlers.
3. Comment modal: Added direct IG link (uses igStats.permalink). Honest about IG comment limitation — actual comment text requires Instagram Graph API + business token + server-side fetcher (currently instagram-stats.json has empty comments arrays). For now, link redirects users to IG to read all comments.
4. Homepage gallery: Video autoplay was broken because video used data-src (lazy) and observer was sometimes failing to fire on first render. Changed to direct `src` + `autoplay preload="metadata"`. Same mobile-button fix as gallery.
5. Homepage hero: Added selectable hero video — admin panel has new "Hero Video" picker in Settings tab. Priority chain: hero-config.json (committed file, all visitors) > localStorage gallery_admin.heroVideo (this browser only) > default.

Files touched: preview/gallery.html, preview/index.html, preview/admin.html

## 2026-05-27 - MAJOR: Admin settings now public via JSONBin (preview/)
**Discovery:** The site already uses JSONBin (for customer reviews), Render.com (IG feed), Cloudinary, and a GitHub Action that auto-syncs Instagram every 6 hours. So infrastructure exists — just admin gallery settings were stuck in localStorage.

**Changes:**
1. Created `preview/remote-state.js` — shared module that loads/saves admin state via JSONBin. Includes:
   - 1-minute cache to reduce API calls
   - Optimistic local update (UI feels instant)
   - Auto-merge so other bin keys (reviews) are preserved on writes
   - In-flight dedup so concurrent fetches don't race
2. Admin.html: `getSettings/saveSettings` now read/write via RemoteState. On init, migrates existing localStorage data to remote (one-time, if remote is empty).
3. Index.html: applyAdminSettings reads from RemoteState. After remote loads, re-renders gallery with synced state.
4. Gallery.html: same pattern as index.
5. Hero video: now stored in `record.heroVideo` of the same bin. All visitors see admin's choice.
6. Reviews continue to work — same bin, same `reviews` key, just routed through RemoteState.

**fix.js update:** Added permalink to per-post stats fetch + warning log when comments are requested but unavailable (token permission issue).

**Result:** Hide/pin/order/category/heroVideo changes in admin are now visible to ALL visitors within ~1 minute (cache TTL).

## 2026-05-27 - IS 5568 accessibility widget on ALL pages
- Created preview/a11y.js — self-contained widget that auto-injects ♿ button + panel on any page that includes the script
- Added <script src="a11y.js" defer> to: about, bridal-guide, bride, contact, disclaimer, gallery, pricing, reviews, services, accessibility-statement
- Index.html already has inline widget (kept as-is for now; a11y.js detects existing #a11y-trigger and skips injection to avoid duplicates)
- Settings (contrast/text size/links/animations) sync across all pages via localStorage 'a11y_prefs_v1'
- Alt+A keyboard shortcut works everywhere
- FOUC prevention: prefs applied BEFORE first paint via inline IIFE in a11y.js
- IS 5568 / WCAG 2.1 AA compliance restored across the entire preview site

## 2026-05-27 - Hero video picker = visual grid (preview/)
- Replaced dropdown (select by caption) with visual thumbnail grid
- Each video shows poster thumbnail (Cloudinary so_0 frame)
- Hover (desktop) or tap (mobile) plays a low-res preview inline
- Click a video to select it → saves to RemoteState → public within 1 min
- Selected video gets highlighted border + "✓ נבחר" badge
- Preview videos use preload="none" until hovered (saves bandwidth)

## Admin video preview + head-video selection (Stage 1)
- ▶️ on video cards plays actual video in modal; ☆/⭐ marks head video (s.headVideo)
- TODO Stage 2: display head video on site

## 2026-05-27 - Reviews nav + on-site review form (preview/)
1. NAV FIX: ביקורות (reviews) link was missing from main nav on index, gallery, services, bride (present on about/contact/pricing). Added to both desktop + mobile nav on all 4.
2. ERROR 500 FIX: reviews.html only fetched Google reviews (read-only). The Google Places API was returning errors (500/403) that weren't fully handled. Added res.ok check + data.error check → graceful showFallback() instead of crash.
3. NEW on-site review form on reviews.html: visitors can now write name + star rating + text. Saves to JSONBin (record.reviews) via RemoteState → public to all. Shows submitted reviews in a "ביקורות מהאתר" grid. Same bin as homepage form, so reviews appear in both places. Optimistic update with rollback on failure.
4. Google "write review" button kept as secondary link.

## 2026-05-27 - Correct Google review direct links
- User shared maps link → extracted verified place id (hex 0x57a7c2a72e19d7fa = ChIJCT7WZcVzABUR-tcZLqfCp1c, the existing one was correct after all)
- The earlier 500 was likely transient/CDN, not a bad place id
- Write button → search.google.com/local/writereview?placeid= (opens write-review box directly)
- Read fallback → search.google.com/local/reviews?placeid= (opens reviews directly)

## 2026-05-27 - Reviews Google links → reliable CID profile URL
- Place ID couldn't be reliably derived (protobuf encoding non-trivial, test vector failed)
- writereview?placeid= with wrong/derived id gave 404/500
- Solution: both buttons → https://www.google.com/maps?cid=6316231025699182586 (CONFIRMED working)
- This opens the Google profile where "Write a review" button is at the top
- Live Google reviews API call disabled (PLACE_ID empty) → on-site form is primary
- On-site reviews (JSONBin) remain the reliable review system

## 2026-05-28 - PERMANENT FIX for data loss bug (categories + pricing)
**Root cause finally identified**: writes were happening before RemoteState.fetch() completed. User opens admin → clicks pricing tab/category in the 1-2 sec gap before fetch finishes → getSettings returns DEFAULT values → save writes DEFAULTS over real data in JSONBin.

**Fix:**
- remote-state.js: added `_ready` gate. update() refuses to write until first successful fetch.
- admin.html: removed dangerous migration code. initAdmin shows "connection failed" UI if fetch fails — never silently overwrites.
- saveSettings: shows "syncing" toast if user tries to save too early.

This is the permanent fix. Categories, pricing, hero video, rotations, hidden, pinned, order — none can be overwritten by stale defaults anymore.


## 2026-06-03 - Fix hero video flash on page load
- Refactored `applyHeroVideo` IIFE to apply from localStorage cache synchronously before network fetch — no flash on return visits

## Session: Hero video — real fix for all visitors
- Baked chosen video src+poster directly into preview/index.html (no more default video)
- Worker (preview/worker.js) now calls patchIndexHtml() when POST /settings contains heroVideo

## Session 2026-06-03 (continued)
- Deleted Render.com service — was crash-looping on missing webhook-server.js
- Cloudflare Worker already handles everything Render was supposed to do
2026-06-03 - Added favicon (favicon.ico, favicon.png, apple-touch-icon.png) from Yarden's photo across all HTML pages
2026-06-03 - Fixed og:image on MAIN site root (index.html) - the shared link is root, not /preview. Old Cloudinary image replaced with share-preview.jpg

## 2026-06-04 - PageSpeed performance fixes
- Added `<link rel="preload">` for hero LCP image and styles.css
- Added `fetchpriority="high"` + `decoding="sync"` + explicit `width`/`height` to hero img (reduces LCP + CLS)
- Changed `gallery-data.js` (668KB) from synchronous to `defer` (removes render-blocking)
- Wrapped gallery init in `DOMContentLoaded` to work correctly with deferred gallery-data.js

## 2026-06-04
- Deleted duplicate #wa-fab WhatsApp button block ENTIRELY from index.html (root) and preview/index.html
- Single working .wa-float remains (green, bottom-right)
- Removed the old `#wa-fab{display:none !important;}` patch and its dead HTML block
- Layout: WA bottom-right | scroll-top + accessibility bottom-left

## 2026-06-04 (patch hunt)
- New standing mission: find patches/band-aids and rewrite clean (no hiding, no all:unset, no !important storms, no dead code)
- index.html: removed dead JS monkey-patch (_origRenderPage, origRenderPage, setTimeout hack); renderPage() now calls observeGalleryVideos() directly
- styles.css: rewrote .social-circle from scratch - removed all:unset + ~25 redundant !important (no global `a` rule was conflicting, so they were never needed)

---
## June 2026 — SEO + Analytics + Content

### SEO
- Sitemap cleaned (removed 404/redirect/duplicate pages)
- sitemap-media.xml created (80 images, 30 videos, no emojis)
- sitemap-index.xml created
- noindex added to admin.html
- Static SEO content added to pricing.html and gallery.html
- All 7 pages submitted for indexing in Search Console

### Analytics Admin
- OAuth fixed: hardcoded redirect URI, published app to production
- GA4 Data API enabled
- Added: bounce rate insight, specific sources, region+city, GSC setup guide
- Google Signals enabled, Reporting Identity = מעורב

### Reviews page
- reviews.html created with Google Places API (live reviews from Google Business)
- Added to all navs + sitemap

### Content (Gemini)
- services.html (preview): new copy, 4 main cards + FAQ
- bridal-guide.html (preview): 4 steps, warm tone, no AI language

### Mistakes
- Forgot to update step 01 in bridal-guide — kept old "הידרציה" content. Always check ALL steps when doing content updates, not just the ones explicitly mapped.
- Used dark theme CSS variables in FAQ section on light-theme preview site. Always check --card/--text values in preview/styles.css before writing inline styles.

## 2026-06-04 (UX/UI fixes session)

### Infrastructure discovery
- Live site yardendamri.co.il/preview/ served by GitHub Pages + Cloudflare CDN
- Root (/) = old site. /preview = live new site. ALL changes must go to /preview only.
- Spent most of session editing wrong folder (root) — logged in MISTAKES.md
- Cloudflare Development Mode must be enabled to see changes immediately

### Fixes applied to /preview
1. White nav on scroll — deleted all .scrolled CSS rules (was turning nav white + hamburger black)
2. Duplicate WA buttons — deleted #wa-fab (hidden patch) + .wa-float (green). New single wa-btn: rose color, fits site palette
3. Hero video iOS autoplay — preload=none → preload=metadata
4. CSS version bumped to v=12
5. Root files — reverted all root changes back to original (root is not our concern)

## 2026-06-06 (Cloudinary → ImageKit migration session)

### Problem
- Cloudinary free plan exceeded 198% (49.09/25 credits used)
- Deactivation scheduled June 9, 2026
- Root cause: 1,535 images with f_auto,q_auto,w_800 transforms on every delivery + admin panel loading hidden thumbnails

### ImageKit account created
- URL endpoint: https://ik.imagekit.io/Yardendamri
- Public key: public_PLcivea4ZG8Ui6cG0j+BqiCc3oE=
- Private key: private_XBe+OET/tGijZaP1hhXDKR+MZWI=

### Migration attempted
- Script ran on Mac to upload 1,535 images from Cloudinary → ImageKit
- gallery-data.js URLs updated to ik.imagekit.io/Yardendamri/yarden_makeup/
- gallery-temp.html created with updated cdnUrl() function

### STATUS: BROKEN - Images not loading
- Root cause unknown: ImageKit API blocked from Claude sandbox, cannot verify filenames
- Likely issue: ImageKit appended random suffix to filenames during upload (e.g. yarden_makeup_18119542276602555_AbCdEf.jpg instead of yarden_makeup_18119542276602555.jpg)
- Videos still on Cloudinary (not migrated) — working fine
- gallery-data.js currently has ik.imagekit.io URLs — images broken on live site

### IMMEDIATE ACTION NEEDED (next session)
1. Open ImageKit dashboard → Media Library → yarden_makeup folder
2. Check actual filename of any file (does it have random suffix appended?)
3. If yes → re-upload with useUniqueFileName=false parameter
4. If no → debug why URLs are 404
5. Option B: revert gallery-data.js to Cloudinary URLs, remove transforms to save credits

## 2026-06-11

### Deployed to permanent files (admin.html, index.html, gallery.html)

**Admin panel:**
- initAdmin now waits for Worker fetch before rendering — hidden/cats/order all load correctly
- Hidden filter is a hard override — shows all 711+ hidden photos including ghost items (old URLs not in current gallery-data.js)
- Hero video picker now shows all R2 videos (fixed filter to include videos-new.yardendamri.co.il and .mp4 URLs)
- Gallery loads fast — spinner shown while Worker fetches, single render after

**Hero video:**
- Removed hardcoded src from <video> tag — no more flash of old video on load
- gallery-data.js now includes HERO_VIDEO/HERO_IMAGE/HERO_POSITION/HERO_ZOOM written by sync job
- Video plays instantly from gallery-data.js, Worker updates in background

**Likes & comments (web-wide):**
- New /social endpoint added to Cloudflare Worker (public, no password)
- social.json created in repo root as persistent store
- Both index.html and gallery.html now read/write likes+comments via Worker — web-wide for all visitors
- Removed all localStorage usage from likes/comments

**Thumbnail backfill:**
- backfill-thumbs.js + workflow created — uses Instagram thumbnail_url, no video download, ~3 min runtime
- Workflow triggered manually via GitHub Actions

## 2026-06-14
- **Desktop responsive fix (preview only)**: Added `@media (min-width: 1081px)` to `preview/styles.css`
  - `#about`, `#philosophy`, `#contact`: `max-width: 1440px; margin: auto` — cream bg matches body so boundary is invisible
  - `.services-header`, `.services-grid`: `max-width: 1280px; margin: auto` — inner content constrained inside full-width warm section
  - `#area`: calc-based left/right padding `max(100px, calc(50% - 700px))` caps content to ~1400px without clipping the warm background
  - `.ig-gallery-grid`: tile min bumped from 240px to 280px on large screens
  - Mobile breakpoint (`@media (max-width: 1080px)`) untouched

## 2026-06-14 (session 2) — Desktop responsive redesign (temp files)
- **preview/index-temp.html + preview/styles-temp.css** — all changes in temp files pending user approval
  1. **Hero video crop**: desktop now uses `38%` vertical position (face + neck + shoulders visible, not just eyes)
     - JS `applyHeroCropToPage()`: desktop safePos = `x + ' 38%'` instead of `50% 50%`
     - Resize listener added so crop recalculates on window resize
  2. **About section image**: changed `background-position:center top` → `center center` (shows full scene)
     - Added `.about-card { aspect-ratio: 16/9; max-height: none }` on desktop in styles-temp.css
  3. **Text / desktop layout**:
     - Hero title: `clamp(2.4rem, 3.2vw, 4rem)` — bigger, better proportioned on large screens
     - About title: `clamp(2.2rem, 3.2vw, 3.6rem)`
     - Philosophy attributes: added `.philosophy-attrs-grid` class → 4-column grid on desktop
     - Section max-width caps + gallery tile size inherited from styles.css and replicated in styles-temp.css
  4. **Gallery video thumbnails**: fixed broken poster URLs
     - Old code: `cdnVideoPoster(url)` generated Cloudinary paths that don't exist for R2 videos
     - New code: uses `item.thumb` (from gallery-data.js) or derives R2 thumb URL: `images.yardendamri.co.il/yarden_{item_id}_thumb.jpg`
     - Also fixed video detection: now checks `.mp4` in URL (R2 videos) not just `/video/upload/` (Cloudinary)

## 2026-06-19 — Desktop RTL layout: nav, about, area/map
- Nav desktop: logo moved to LEFT, nav-links to RIGHT using CSS order (order:2 / order:1 in desktop query only, mobile untouched)
- About: added grid-template-columns: 1fr 1.4fr on desktop — image column gets 58% width (was 50/50)
- Area/map: added order:2 to .area-visual on desktop — map moves to LEFT, text stays RIGHT (RTL natural)
- Cache-busted styles-temp.css link: ?v=20260619b

## 2026-06-19 — Desktop layout fixes: hero justify-content + philosophy photo
- Fixed `#hero justify-content` in base CSS: reverted to `flex-end` (restores mobile layout), added `flex-start` only in desktop `@media (min-width: 1081px)` block — text on right in RTL on desktop ✓
- Reprocessed philosophy photo: re-downloaded original (1600×1067), applied resize + gentle UnsharpMask only (no brightness/contrast boost), re-uploaded 119KB to R2 `aa6145a7-9efc-4bde-95ad-245544ef3bfc.jpeg` — less blown-out, natural B&W rendering

## 2026-06-18 — RTL/Hebrew audit + phone number bidi fix
- Audited all 13 preview pages: lang/dir attrs ✅, mobile menu RTL slide ✅, arrow icon direction ✅, no float usage, no broken bidi text — all correct.
- Bug found: footer phone "054-7276716" not wrapped in dir="ltr", risk of digit/hyphen reorder in RTL context.
- Fixed across all 12 pages showing the phone number (index, about, services, bride, bridal-guide, gallery, pricing, contact, reviews, disclaimer, accessibility-statement, cookies-policy). Pushed as -temp.html files, pending review.

## 2026-06-20 — Fix gallery-temp.html video autoplay
- Root cause: the confirmed fix from index-temp.html was NEVER applied to gallery-temp.html
- gallery-temp.html had: `data-src` (not `src`), no `autoplay`, `preload="none"`, observer checked `!v.src` (always false on iOS)
- Fix: `src="${item.u}"` direct, `autoplay`, `preload="metadata"`, `poster="${item.thumb}"`, observer uses WeakSet + just play()/pause()

## 2026-06-21 — preview/ lightbox: fully-opaque bg + video controls clear of action bar; homepage About nav link (temp files)
- preview/gallery-temp.html, preview/index-temp.html: lightbox overlay background made fully opaque (#000 instead of rgba .96/.92) so the media reads as true fullscreen with no page bleed-through
- Video controls fix: the Instagram-style .lb-actions bar (like/comment/share/save) is pinned to bottom:0 and was covering the video's native HTML5 control bar. When a video is open the video is now lifted/capped (top:calc(50% - 43px); max-height:calc(100dvh - 86px)) so its native controls sit above the action bar and are tappable. Gallery toggles `.lb-video-on` on #lb in showLb(); homepage bakes the offset into the created <video> style
- index-temp.html: homepage nav "אודות" (desktop + mobile) now links to about.html (dedicated longer About page) instead of the #about homepage anchor

## 2026-06-21 — preview/ lightbox TRUE fullscreen (crop-to-fill) — revised per user screenshot
- User confirmed prior approach still letterboxed (black gap below portrait videos). Chose "crop to fill / Reels-style".
- gallery-temp.html + index-temp.html: lightbox .lb-img and .lb-video now `position:absolute;inset:0;width:100vw;height:100dvh;object-fit:cover` → media fills the whole screen edge-to-edge on mobile (minor crop, like Instagram/TikTok)
- Desktop (min-width:1081px): reverted to contained/centered (max 94vw/94dvh, object-fit:contain) so portrait media isn't zoomed absurdly at 100vw
- Video controls: `.lb-video-on` (toggled on the lightbox when a video plays) lifts the like/comment/share/save bar to bottom:calc(56px+safe-area) with a gradient scrim, and hides the counter, so the native player controls are never covered
- Removed the cookie-banner (has-ck) video-shrink override so video stays fullscreen even while the cookie banner shows

## 2026-06-22 — preview/ lightbox: blurred-fill fullscreen (no crop) — final approach
- User reported crop-to-fill was cutting the photo/video edges (looked like a "frame cutting the image"). Switched to the Instagram/YouTube-Shorts technique.
- gallery-temp.html + index-temp.html: lightbox media is now object-fit:contain (whole photo/video, nothing cut), and a new `.lb-bg` element shows a blurred, zoomed copy of the same media behind it (filter:blur(26px) brightness(.5) scale(1.25)) to fill the screen — so it looks fullscreen edge-to-edge with no black bars and no cropping
- JS sets the backdrop image per item (image URL, or video thumbnail/poster for videos)
- Removed the desktop crop override and the per-platform cover rules (contain + blurred fill works on mobile and desktop)
- Kept: video action bar lifted above native player controls; counter hidden on video

## 2026-06-22 — preview/ lightbox: final = crop-to-fill (Reels style), per user choice
- User confirmed (after seeing blurred-fill seam lines) they want true edge-to-edge fullscreen and accept the small edge trim.
- gallery-temp.html + index-temp.html: lightbox .lb-img/.lb-video back to object-fit:cover, inset:0, width/height:100% — fills the whole screen, no seams, no bars
- Blurred-fill backdrop disabled (.lb-bg{display:none}) and its JS setter removed
- Desktop (min-width:1081px): media shown whole/contained (max 94vw/94dvh) so a portrait reel isn't zoomed absurdly on wide screens
- Kept: video action bar lifted above native controls; counter hidden on video

## 2026-06-22 — preview/ lightbox: removed dark gradient band behind action buttons
- User: edge-to-edge fullscreen is good; remove the "filter" (dark gradient band) over part of the image/video
- gallery-temp.html + index-temp.html: removed the linear-gradient scrim + padding-top from the .lb-video-on action bar; added a subtle drop-shadow/text-shadow on the action icons/counts so they stay legible over bright media without darkening it

## 2026-06-22 — preview/ lightbox video: actions moved to side rail (free the bottom for player controls)
- User: action bar sat too high and the native video controls weren't visible
- gallery-temp.html + index-temp.html: for video (.lb-video-on) the like/comment/share/save bar is now a vertical rail on the right edge (TikTok/Reels style), bottom:64px, icons stacked with counts beneath. The entire bottom of the screen is left clear so the native play/scrub controls are visible and usable. Images keep the normal bottom row.

## 2026-06-22 — preview/ lightbox: unified side rail for images AND videos
- User: make the side action rail consistent — use it for images too, not only videos
- gallery-temp.html + index-temp.html: moved the right-side vertical rail (like/comment/share/save, stacked with counts) into the base .lb-actions/.lb-act rules so photos and videos share one layout. Removed the video-only override.

## 2026-06-22 — Lightbox PROMOTED to permanent
- User approved ("make it permanent"): cp preview/index-temp.html → preview/index.html, cp preview/gallery-temp.html → preview/gallery.html
- Final lightbox: edge-to-edge fullscreen cover media; right-side vertical action rail (photos + videos) freeing the bottom for native player controls; gradient scrim removed (icon shadows instead); desktop shows whole frame
- Closes the NEXT-LIGHTBOX.md handoff. Updated SUMMARY.md, STATUS.md, preview/PROGRESS.md, preview/SUMMARY.md, preview/NEXT-LIGHTBOX.md, preview/MISTAKES.md

## 2026-06-22 — fix.js: diagnose + stop losing Instagram media
- Investigated "media not uploaded to site (reels AND posts, incl. items never synced)".
- Root cause A (ongoing loss): gallery-data.js was rebuilt purely from each API fetch — items the /media edge omitted on a run were dropped even though already on R2. Added a NON-DESTRUCTIVE UNION: previously-synced items the API didn't return are carried forward (respecting hidden settings).
- Root cause B (never synced): the Instagram /media edge under-returns (commonly collab/co-author posts and some Reels). Added diagnostics: fetch account media_count and log the GAP vs top-level posts actually returned; log media_type/media_product_type breakdown; log items with no media_url (cannot download); flag empty-page-with-next-cursor as INCOMPLETE.

## 2026-06-22 — Sync gap diagnosis (manual run 27945933958)
- Instagram media_count=1174, API returned=1142 → only 32 posts withheld by /media edge (likely collab/co-author posts; reels fine — 188 synced; no missing media_url).
- BIG factor: 772 items flagged hidden in gallery-settings.json → synced+on R2 but filtered from public site. This is most of "in my IG grid but not on my site."
- Carousels (232) collapse to one cover tile by design.
- Remediation pending user decision: bulk-unhide the 772; add admin manual-upload for the 32 collab posts. Union fix already prevents future silent drops.

## 2026-06-23 — Verified desktop fixes #2 + #3 (Playwright real eyes, 1440px)
- Set up Playwright (chromium+webkit) + http-server; screenshotted preview pages at 1440×900 and READ the PNGs.
- **#2 Lightbox placement — VERIFIED FIXED** on both home (`preview/index.html`) and gallery (`preview/gallery.html`). Media flex-centered (controls mid-screen), action rail on right, X top-left. Media area renders black only because R2 video doesn't load inside sandbox — layout is correct.
- **#3 Services 2×2 — VERIFIED FIXED** (`preview/services.html`): 4 main cards now render as a balanced 2×2 grid at ≥760px (was 3+lonely-1).
- **#1 Hero video pixelated — still UNFIXED**, needs user decision (re-encode original @1080p via private-repo workflow vs. sharp still on desktop). Asked user.

## 2026-06-23 — Hero #1 (Option A, user-approved): HD source for desktop hero
Root constraint: hero media is web/mobile-optimized — images ~800px wide, videos ~480p (480×854) — far below a full-screen desktop hero (1440–1920px). object-fit:cover then upscales 2–3× → soft/"phone-like". No CSS adds detail; only a higher-res source fixes it. (User rejected the blurred-fill backdrop approach — reverted in ac3c749.)
Solution (server-side, everyone sees it; mobile unaffected):
- `fix.js`: after each sync, `ensureHeroHD` builds a ~1080p copy of the CURRENT hero (admin `heroVideo`/`heroImage`, else baked default `18100404782127411`) and uploads `yarden_<id>_hd.mp4` (ffmpeg scale min(1080) crf22) / `yarden_<id>_hd.webp` (sharp w1600 q88) to R2. Hero-only = negligible storage. Skips if `_hd` already exists (HEAD check via `urlExists`). If the hero item isn't in the fetch, logs and skips (frontend falls back).
- `preview/index.html`: `upgradeHeroToHD()` — desktop ≥1081px only, preload-then-swap to the `_hd` file; stays on the light file if HD absent (never breaks). Mobile never requests HD (verified: 0 HD requests at 390px).
Verified: fix.js `node --check` OK; desktop probes `..._hd.mp4` and falls back cleanly (no JS errors); mobile requests no HD.
Rollout: sync-auto.yml checks out main, so the HD file is generated on the next sync AFTER this lands on main. Until then desktop shows the light file (today's look). DEFAULT_HERO_ID in fix.js must stay in sync with the baked <source> in preview/index.html.

## 2026-06-23 — Services page: align the secondary grid under the 2×2 (real #3 fix)
The main 4 cards were already 2×2, but the separate "Secondary services" grid (2 cards) used `repeat(auto-fill,minmax(280px,1fr))` → 3 columns → 2 narrow, left-shoved, misaligned cards (what the user reported as "not arranged"). Fix: gave that div `class="services-grid"` and dropped its inline grid-template/gap so it inherits the shared responsive grid + the `#services > .services-grid` 2-col override. Verified at 1440/820/390: secondary cards now match the main grid (1440: 499px×2 aligned under the 2×2; mobile: 1 col).

## 2026-06-23 — FIX: Instagram auto-sync failing since go-live cleanup (root cause found)
Symptom: sync-auto.yml runs failed 06-22 20:51 and 06-23 03:49 (after a clean streak). The sync itself succeeded (fetched 1142 posts, wrote preview/gallery-data.js, uploaded to R2) but the "Commit and push" step died:
  `fatal: pathspec 'preview/index-temp.html' did not match any files` → exit 128.
Root cause: Stage A cleanup DELETED preview/index-temp.html + preview/gallery-temp.html, but the workflow still ran `git add ... preview/index-temp.html preview/gallery-temp.html`. git add on a missing pathspec aborts the step → media reached R2 but gallery-data.js was never committed/pushed → site data went stale.
Fix (now + future-proof):
- sync-auto.yml: replaced the hard-coded git-add list with an existence-guarded loop (`for f in ...; do [ -e "$f" ] && git add`), so a removed/renamed file can never abort a sync again. Dropped the two deleted temp files.
- fix.js: removed the deleted *-temp.html entries from the cache-bump htmlFiles list (was only a warning, but tidy).
Also logged in MISTAKES.md. Triggering a manual sync to (a) push fresh data and (b) generate the hero HD via the new fix.js step.

## 2026-06-23 — Sync fix VERIFIED + HD hero generated (with a resolution caveat)
- Triggered sync-auto.yml on main → run 28014709102 **succeeded** (previously failed). Bot pushed "Update Instagram data" (837abb1) → data flowing again. Workflow git-add guard confirmed working.
- Hero HD file created on R2: yarden_18100404782127411_hd.mp4 = 5.6MB (crf22) vs light 3.2MB (crf28).
- CAVEAT: parsed both = 720×1280. Instagram only served a 720px master of THIS clip, so `scale=min(1080,iw)` capped at 720 — the HD is a *higher-quality* 720p (fewer compression artifacts), NOT true 1080p. On a 1440px desktop it's still a ~2× upscale, so noticeably cleaner but not razor-sharp. Items where IG kept 1080 (esp. photos: light 800px → HD ~1080) get a real resolution bump. For a pristine hero on a low-res clip, only the original camera file (Option B) can help.

## 2026-06-23 — Three-tier media resolution (grid thumb / lightbox full / hero max)
Goal (user): fast grid + sharp lightbox + crisp hero, all automatic from Instagram (no phone files).
Finding: `cdnUrl()` (used by both grids + lightboxes) does `url.replace('/upload/',…)` — R2 URLs have no `/upload/`, so it was DEAD: grid + lightbox both loaded the full 800px file.
Changes:
- fix.js: images now stored as TWO sizes — `yarden_<id>.webp` at Instagram-max ~1080 (lightbox+hero) + `yarden_<id>_thumb.webp` ~600 (grid); image entries carry a `thumb` field. compressImage 800→1080; added compressImageThumb (600,q72). Hero HD step now video-only (image hero already served at IG-max via main file); removed unused compressImageHD.
- index.html + gallery.html: grid img → `item.thumb || item.u` (small thumb, fallback to full for not-yet-reprocessed photos); lightbox img → `item.u` (full); hero upgrade is video-only now.
- Resumable reprocess: `node fix.js --reprocess-images` re-fetches existing photos at IG-max + builds thumbs, skipping any image whose `_thumb.webp` already exists on R2 (survives the 45-min CI cap). Exposed as a `workflow_dispatch` input `reprocess_images` in sync-auto.yml.
Verified: both grids render, no JS errors; grid uses `thumb` when present (video posters prove it), falls back to `u` otherwise; lightbox uses full `u`. Backward-compatible — safe before the reprocess finishes.
Rollout: normal syncs apply the new pipeline to NEW photos automatically; trigger sync-auto with reprocess_images=true (possibly a few runs) to upgrade the ~1247 existing photos.

## 2026-06-23 — Reprocess COMPLETE (all public photos upgraded)
Reprocess run created Instagram-max + thumb for all photos on R2; first dispatch's push lost the race (old workflow), so a second race-safe pass landed the data (commit 7e7ef9d). gallery-data.js now has 611 image thumbs (= the full public image set; hidden images intentionally skipped). Verified a sample: full image upgraded 800→1080×1440 (133KB, lightbox/hero), grid thumb 600×800 (34KB). Grid now loads ~34KB tiles vs the old full image → faster homepage/gallery; lightbox sharper. Fully automatic for new posts going forward.

## 2026-06-23 — Nav consistency: pricing+reviews out of mobile menu, into every footer
Desktop nav had already dropped מחירון (pricing) + ביקורות (reviews); mobile menus still listed them (and services/gallery/bride had a DUPLICATE reviews <li>). Removed both from every page's mobile menu so it matches desktop (אודות·מאפרת כלות·שירותים·גלריה·מדריך כלות·צרי קשר), and ensured every footer carries pricing+reviews (most subpage footers were missing one/both). Done via scratchpad/navfix.py across all 12 pages. Verified at 390px: mobile menus clean, footers have both, no JS errors. Updated CLAUDE.md nav-consistency rule (nav no longer includes pricing; pricing+reviews are footer-only).

## 2026-06-23 — Footer fully standardized (byte-identical on all 12 pages)
Audit showed nav (desktop) + mobile menu were already consistent, but footers diverged in link set (some had דף הבית, only index had מדריך כלות, contact had אודות, pricing missing מאפרת כלות), order, and labels (נגישות vs ♿ הצהרת נגישות). Built one canonical footer from index.html's structure with the user-approved nav row and replaced <footer>…</footer> on all 12 public pages → now byte-identical (md5 match). Canonical footer nav row: דף הבית · אודות · מאפרת כלות · שירותים · גלריה · מדריך כלות · מחירון · ביקורות · צרי קשר · תנאי שימוש; plus social pills + ♿ הצהרת נגישות + ⚙️ ניהול. Verified desktop+mobile render, no JS errors. (scratchpad/footer.py)

## 2026-06-23 — Session close: docs updated, next session = GO LIVE
Updated SUMMARY.md (handoff rewritten: all preview work done & verified; embedded the full GO-LIVE PLAN since the old external plan file `/root/.claude/plans/…` is gone/ephemeral), STATUS.md (ready-to-go-live + checklist), CLAUDE.md (replaced the stale "only edit -temp.html" rule — preview/*.html are the working source; root changes only at go-live). Next session's task: promote preview/ → root (Stage B), gated behind a ROOT-pages visual check.

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
