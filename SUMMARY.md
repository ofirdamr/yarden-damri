# Project Summary — Yarden Damri Website

> Last updated: 2026-06-30 (session 9). **Read this first every new session** (PROGRESS.md only if more detail needed).

---

## ▶ NEXT SESSION — START HERE

**▶ START:** invoke the **`universal-framework`** skill — it runs session bootstrap (read CLAUDE.md+SUMMARY, switch to `main`, Token-Economist consult).

**⛔ MODEL: per-task, not blanket.** The Token Economist picks per task — Haiku (mechanical) / Sonnet (standard build + copy) / Opus (architecture, multi-discipline, security, root-cause). Don't sit on Opus for everything; switch via `/model`.

**⛔ BRANCH (first action, non-negotiable):** run `git branch --show-current`. Work on **`main` ONLY**.
Claude Code on the web opens the session on a `claude/...` branch — **IGNORE THAT**; switch immediately (do not defer until "there's work to commit"): `git checkout -B main origin/main`.

**⛔ EDIT THE ROOT FILES.** `preview/` was **deleted (2026-06-24)**. Root `*.html` / `styles.css` / `*.js` ARE the live source. Push to `main` → `publish-public.yml` mirrors to public repo → live site updates.

### ▶▶ NEXT MISSION — pick one

**Pre-marketing QA pass is DONE (session 9, 2026-06-30) — site is ready for marketing/promotion.** Remaining open items, pick what's next:
- **Homepage perf — the real remaining win:** `gallery-data.js` (512KB) + `cloud-storage.js` load
  synchronously and the very next inline `<script>` reads `GALLERY_IMAGES`/`RemoteState` at **top level**
  (not gated on DOMContentLoaded) — so naive `defer` breaks gallery render + hero remote-override on
  first load. Needs: extract the hero-init and gallery-render inline `<script>` blocks to external files,
  mark all 4 scripts `defer` (order-preserving). Do as its own reviewed task — this exact code has a
  hero/gallery regression history (sessions 3, 4, 8). See PROGRESS.md session 10 for full detail.
- **Owner decision needed:** delete orphan `patch-stats.js`? (no workflow/script references it, found during session 9 code-health audit)
- **Low-priority SEO polish** (flagged, not yet fixed): add Twitter Card meta tags site-wide; add JSON-LD to pricing.html; add `lastmod` to `sitemap-media.xml`
- **HSTS ramp** — see "Open / pending tasks" below, ready any time now (2026-06-28 gate already passed)
- **First mission for the Hebrew Copywriter** — full recopywrite pass, queued since session 5 (Sonnet model)
- **Marketing/promotion phase** — site QA'd and verified live; future = more pages/features/value

### ✅ DONE (session 10, 2026-07-01) — homepage PageSpeed fixes

Owner shared a mobile PageSpeed Insights link. Lighthouse/Playwright can't run against the live domain
in this sandbox (proxy TLS handshake fails even with the CA imported into NSS trust) — did a manual
curl-based audit instead. Fixed the 3 safe render-blocking issues on `index.html` (commit `ed61be8`):
Google Fonts stylesheet → preload+swap async pattern; `site-content.js` → `defer` (zero-risk, was
already DOMContentLoaded-gated internally); `#heroImage` (LCP element) → `fetchpriority="high"`.
Verified locally via Playwright (desktop+mobile, hero renders instantly, gallery still populates, no
console errors) and live post-deploy (all 3 changes confirmed in served HTML, 200 OK). Bigger win
(deferring `gallery-data.js`) intentionally NOT done — see next-mission item above, needs its own pass.

### ✅ DONE (session 9, 2026-06-30) — pre-marketing QA pass

Ran **Hybrid** orchestration: 4 parallel audit subagents (SEO/meta, code health, visual/Playwright, Hebrew+RTL) → merged into one prioritized list → fixed directly → live-verified via curl. Commit `81512f2`. Full detail in `PROGRESS.md`.
- **bride.html SEO** no longer leads with "אילת" (title/description/JSON-LD; page serves brides nationwide).
- **9 RULE 5 (em dash) violations removed** from live Hebrew copy across index/gallery/pricing/reviews.html.
- **reviews.html** malformed JSON-LD phone number fixed.
- **og:image added** to 6 pages that were missing it (about/services/gallery/pricing/contact/reviews).
- **`fix-audio.yml`** dead `preview/` references removed (would have failed if ever triggered).
- **Deleted orphan files**: `worker/copywriter-endpoint.js` + stale `worker/HANDOVER-content-editor.md`.
- **Visual QA**: hero, gallery, lightbox all PASS — **lightbox desktop action-bar bug (open since session 3) is now CONFIRMED FIXED** (measured ~10px gap, not pushed to screen edge).
- Playwright couldn't run natively in-sandbox this session (browser version mismatch, env-only — CI is unaffected). Visual checks done via a scratchpad-only Playwright config working around it.

### ✅ DONE (session 8, 2026-06-30)

- **Admin media reorder (drag) — LIVE.** Desktop HTML5 drag + mobile long-press (400ms) touch drag. iOS hijack fixed: `draggable` only on non-touch + `-webkit-user-drag:none`; `display:none` clone during `elementFromPoint`. Saved order applied on public site (`applyAdminSettings` sorts by `s.order`; un-arranged/new items kept at top in natural order). `admin.html`, `index.html`, `gallery.html`.
- **Videos "disappeared" — FIXED.** A stale/auto-generated `order` had pushed all videos to the end → homepage page 1 showed 0 videos. Reset `admin.order=[]` (everything else byte-identical) → natural newest-first restored.
- **Dark hero — ROOT FIX.** `fix.js` was re-baking the video-hero `#heroImage` poster as `src="" display:none` every 6h sync → dark box when autoplay blocked. Now bakes poster `_thumb.jpg` + `display:block`; `index.html` poster restored + runtime guard. Visual-QA'd desktop+mobile autoplay-blocked. **CLAUDE.md RULE 3 now mandates a visual render check for gallery/hero before "done".**
- **Copywriter context — DEPLOYED.** `/copywriter` + SEO prompts now prepend a factual brand brief (bio, profession, Eilat studio + nationwide bridal travel, full service list, premium long-wear products, differentiators) + native-Israeli-Hebrew/RTL/feminine-singular voice. Writes with knowledge now, not blind rewrites. (Worker deployed via workflow.)
- **CI fixed.** Playwright runs were red only on artifact-storage-quota (tests passed). Uploads now `if: failure()` + `continue-on-error` + 3-day retention → green.
- **Methodology:** Token-Economist now also picks **orchestration mode** (Classic / Parallel fan-out / Hybrid) per task, on a time+tokens tradeoff (skill updated).

### ✅ Open / pending tasks (in priority order)

- **✅ DONE (session 7, 2026-06-27): TOTP 2FA — LIVE and active.**
  - Worker: TOTP engine (RFC 6238, HMAC-SHA1 via Web Crypto), 3 endpoints (`GET/POST /totp-setup`, `POST /totp-disable`), `/login` requires 6-digit code as second step when 2FA is active.
  - `cloud-storage.js`: two-step login flow; `totpGetSetup / totpEnable / totpDisable` methods.
  - `admin.html`: TOTP code step in login screen; 🔐 אימות דו-שלבי section in ⚙️ Settings tab to enable/disable.
  - Deployed via "Deploy Worker" workflow. 2FA enabled and verified live.

- **✅ DONE (session 6, 2026-06-27): media-indexing root cause + friendly AI errors. LIVE.**
  - **Media not indexed — ROOT CAUSE:** `sitemap-media.xml` pointed at a dead Cloudinary host
    (`res.cloudinary.com/dfjwxc1cw/...`), every one of 160 img + 60 vid URLs = HTTP 401, so Google
    indexed nothing. Real media is on R2. **Rebuilt** with real crawlable URLs (611 img + 165 vid,
    hidden excluded) and **wired auto-gen into `fix.js`** (`buildMediaSitemap`) so it rebuilds every
    6h sync + bumps `sitemap-index` lastmod. Live-verified. Search Console: 3 sitemaps submitted +
    read; Google still needs to refetch the fixed media sitemap (was last-read 26 Jun = old version).
  - **Admin AI errors → human Hebrew:** `aiErrMsg()` in admin.html (rate-limit/busy/temporary/network)
    for `/copywriter` + `/transcribe`; no more raw JSON. Live-verified.
  - **VideoObject schema = DEFERRED** (deliberate). Sitemap already makes videos eligible. Only revisit
    if, after Google re-reads the fixed sitemap, videos still aren't indexed — then add `uploadDate`
    (required) + `duration` capture to `fix.js`, backfill 165 videos, emit clean JSON-LD.

- **✅ DONE (session 5): Site-wide CMS + AI copywriter + AI voice + SEO setup + bug fixes. ALL LIVE.**
  - **CMS:** Admin → 📝 **תוכן** tab, page dropdown → edit every text field. **~238 fields** tagged
    `data-edit`/`data-edit-label` across all 12 pages. Editor **auto-discovers** fields per page from
    `CONTENT_PAGES`. Add a field = just tag it in HTML. Stored in `gallery-settings.json` `content` via
    Worker `/settings`; `site-content.js` applies on load, fails safe to baked text. Dynamic content NOT
    tagged (pricing packages, Google-reviews grid, gallery grid).
  - **Editor UX:** **auto-save** (2.5s debounce, "✓ נשמר אוטומטית"); manual save still there; reads freshest
    content from Worker on open (no stale revert); AI panel ✕ סגור; live char-count on SEO title/description.
  - **🤖 AI copywriter + 🎤 AI voice — free Google Gemini `gemini-2.5-flash` + `thinkingBudget:0`** (NOT 2.0-flash:
    key has no free quota; NOT Anthropic). Worker `/copywriter` + `/transcribe`. **Field-aware:** SEO prompt on
    `*.meta.title/description` (keywords+length; **page-aware Eilat**: home/bride/guide avoid leading with אילת,
    local pages keep it), copywriter prompt elsewhere. **No 🤖 on name fields**; never invent names / replace
    "ירדן דמרי". **No em dash** (prompt + strip). All AI logic = `worker/worker.js` → run **Deploy Worker** workflow.
  - **Mic fix:** site sent `Permissions-Policy: microphone=()` (blocked mic on ALL pages). Changed the CF Transform
    Rule (zone `745a6f759dbdf0930afbf8349d2d4835`, ruleset `ea5be0259ede4cf9852576da6ae22df2`, rule
    `b4e62d875ca24b7787f7c6cf525e5629`) → `microphone=(self)` via CF API w/ user-supplied token (revoked).
  - **SEO:** added `WebSite`+`Organization` JSON-LD to index.html; bumped sitemap `lastmod`. Owner already did
    Search Console **verified (domain)** + sitemap submitted; **Google Business Profile** exists (5.0★). Admin
    keywords panel now links straight to Search Console queries.
  - **Bug fixes (verified):** hero blank-on-mobile (`#heroImage` poster `display:none`→`display:block` behind
    video = matches locked RULE 4); **nav overlap** 13–15" (centered name hidden 1081–1500px via
    `.nav-brand-center`; Playwright-measured no overlap 1280–1680).
  - **Playwright** = permanent dep (`@playwright/test@1.49` + CI). Local browser
    `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Env limits:** headless has NO H.264 (can't watch
    video playback); proxy blocks Playwright from the LIVE site (use `file://`/local http-server; curl works for live).
  - **NEXT: the recopywriting mission** — rewrite Hebrew copy page-by-page via the editor + AI. Start with
    **bride.html SEO title** (leads with "אילת" — shouldn't, it's the bridal page).
  - **Open:** hero change kept (matches locked RULE 4). Owner can say "revert the hero" to restore old behavior.

0. **✅ DONE (session 4): gallery + hero media — fast thumbnails, no brown, autoplay kept. Live.**
   - **Thumbnails: 1547/1547 covered.** Every item (301 videos + 1247 images) has a small
     `yarden_<id>_thumb.webp` on R2. `backfill-thumbs.js` (R2-only, data-driven, resumable) made the
     ~773 missing (images from the full `.webp`; videos via ffmpeg first-frame read STRAIGHT from the
     R2 mp4 URL — buffering the whole video truncated it = `moov atom not found`). Grid weight ↓ ~63%.
     `fix.js` makes BOTH `_thumb.jpg` (poster/OG) + `_thumb.webp` (grid) for every NEW video/image each
     sync, so it stays fixed. Grid derives `_thumb.webp` from the id (index.html + gallery.html).
   - **Loading placeholder is LIGHT CREAM** (`#efe7df`), not brown. The original brown shimmer/`#1a1008`
     WAS the "brown" the user kept reporting.
   - **Reveal is bulletproof:** tiles DEFAULT to opacity:1; a `tilefade` CSS animation (fill `both`) only
     ADDS the fade — never depends on `onload` (which doesn't fire reliably on innerHTML imgs → was
     leaving tiles invisible/brown).
   - **Grid video = overlay pattern (KEEP autoplay):** the thumbnail `<img>` ALWAYS stays; an autoplaying
     `<video>` is layered on top and revealed only on its `'playing'` event. If iOS can't autoplay (Low
     Power Mode / throttling) the overlay stays opacity:0 and the THUMBNAIL shows — never blank. (Do NOT
     go back to replacing the img with the video — that's what caused blank video tiles on iOS.)
   - **Hero uses the same pattern:** `#heroImage` (poster still) always behind; `#heroVideo` opacity:0 →
     revealed on `'playing'`. `upgradeHeroToHD` now detects an image-hero by the VIDEO being hidden
     (heroImage is always present now).
   - **Env limit:** headless Chromium here has NO H.264 codec + the proxy blocks the live site, so video
     PLAYBACK can't be tested here — only the still/thumbnail fallback (verified via render with real R2
     thumbnails). Verify real autoplay on a device.

- ~~"Another problem" (vague, never named)~~ and ~~Bug 2 (lightbox desktop actions)~~ — **both closed (session 9):** a full site-wide visual QA pass (hero/gallery/lightbox, desktop+mobile) found no further issues; lightbox action-bar position is confirmed correct (~10px gap from media, not screen edge).
- ~~Verify Instagram sync runs are clean~~ — **stale, dropped.** Sync has been running every 6h without incident for days since the `42ef8ed` fix; no longer worth tracking as an open item.
1. **HSTS ramp — ready any time now (2026-06-28 gate already passed).** HSTS is staged at `max-age=300`. Ramp to `max-age=31536000; includeSubDomains; preload` via Cloudflare API (zone `745a6f759dbdf0930afbf8349d2d4835`). Needs user's scoped Cloudflare token → user revokes it immediately after.

---

## ✅ DONE this session (2026-06-25, session 4)

- **Hero flash — TRUE root cause found and fixed (video + image). Verified live + render-tested.**
  - Real cause (session 3's "fix" regressed within 6h): `fix.js` read `settings.admin.heroVideo` (`""`)
    instead of the **top-level** `settings.heroVideo` (the real admin choice `18094353658922515`). Every
    6h sync re-baked the wrong default `18100404782127411` into `index.html`; the frontend (reads
    top-level) then swapped it at runtime → old-thumb → new-thumb → video multi-stage flash. A leftover
    duplicate `poster=""` made it worse.
  - **Fix:** (1) `fix.js` reads top-level hero fields first; (2) `index.html` baked `<source>`+single
    `poster` corrected to `18094353658922515`, duplicate poster removed; (3) `applyHeroMediaFromState`
    compares by item ID (ignores `_mobile`/`_hd`/ext) so a matching baked hero never reloads — no flash
    on mobile either; (4) `fix.js` baking now idempotent + bakes `<img>` state so **image heroes** paint
    correctly on first load too.
  - **QA:** live HTML confirmed `posters=1 src=yarden_18094353658922515.mp4`; offline Playwright render
    (real index.html + real gallery-settings.json) PASSES on desktop + mobile — hero stays on the chosen
    video the entire load, zero swap. (Chromium can't traverse the agent proxy, so render was done against
    a local server with the live settings intercepted — fully deterministic.)

## ✅ DONE earlier (2026-06-24, session 3)

- **Hero video flash (Bug 1) — attempted, REGRESSED (see session 4 above for the real fix).**
  - Baked admin-chosen hero (`yarden_18094353658922515.mp4` + `_thumb.jpg` poster) into `index.html`.
  - Fixed `fix.js` to bake the correct hero on every future sync.
  - Fixed mobile `<source>` error handler: was on `v` (video element, never fires for source errors) → moved to `s` (source element) so `_mobile.mp4` 404 correctly falls back to base URL.
- **Browser HTML caching fixed (Cloudflare).** Added Transform Rule: `Cache-Control: no-cache` on all `*.html` pages and `/`. Browsers now revalidate HTML on every visit. Verified live.
- **HSTS correctly at `max-age=300`.** Accidentally ramped to production early; immediately reverted. MISTAKES.md updated.
- **CLAUDE.md reorganized.** Non-negotiable rules (RULE 1–9) now at top in bold. Every session opens on the hard rules immediately.
- **Lightbox desktop actions (Bug 2) — code fix in place, live verification pending** (see pending #2 above).
- **Two new mistakes logged in MISTAKES.md** (premature Bug 1 "done"; premature HSTS ramp).

---

## ✅ DONE previous session (2026-06-24, session 2)

- **Cloudflare security headers (live, via API Transform Rule, reversible):**
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`,
  `Strict-Transport-Security: max-age=300` (staged).
- **Secret scan** → removed hardcoded Google Places API key from `reviews.html`. User rotated the key.
- **Confirmed private files are not public:** `.md`, `fix.js`, `tests/`, `.github/` all return 404 on live site.
- **Retired `preview/`:** deleted the folder (27 files), rewrote CLAUDE.md, cleaned `robots.txt`.
- **Added `.well-known/security.txt`** (RFC 9116).
- **Fixed Instagram sync** broken by `preview/` deletion (commit `42ef8ed`, 2026-06-24 15:24 UTC).
- **User-side actions DONE:** Google Places API key rotated, Bot Fight Mode ON, www Proxied.
- **Added Professional Hebrew Copywriter** to CLAUDE.md team roles.

---

## Architecture (current, post repo-split)

- **Two repos.** Private `ofirdamr/yarden-damri` = full history + Actions + secrets + working source (root files). Public `ofirdamr/yardendamri-site` = auto-generated mirror that serves the domain.
- **Publishing:** push to `main` → `.github/workflows/publish-public.yml` copies an **allowlist** of site files to the public repo (no `.md`, no `fix.js`, no `tests/`, no `.github/`) and always writes `CNAME`.
- **Hosting:** public repo → `yardendamri.co.il` via **GitHub Pages** (apex A records = GitHub's 4 IPs), **proxied through Cloudflare**.
- **Build:** pure HTML/CSS/vanilla JS, no bundler.
- **Media:** Cloudflare R2 — `images.yardendamri.co.il` (photos + `_thumb.webp`/`_thumb.jpg`), `videos-new.yardendamri.co.il` (compressed mp4).
- **Gallery data:** root `gallery-data.js` — auto-generated by `fix.js` every 6h. Items: `{u,a,item_id,post_id}`; videos `{video:true,thumb}`; flags `hidden:true`, `carousel:true`+`cidx`+`ccount`. Deep link `gallery.html?m=<id>`.
- **Admin settings:** `gallery-settings.json` — written via GitHub API by the Cloudflare Worker (`api.yardendamri.co.il`). Worker writes to the PRIVATE repo. Now also holds `content` (CMS text overrides).
- **Cloudflare Worker is REPO-MANAGED.** Source = `worker/worker.js` (private, not published). Deployed by the `Deploy Worker` GH workflow (`workflow_dispatch`, deploys via CF API; KV `SESSIONS` + secrets `ADMIN_PASSWORD`/`GH_TOKEN`/`GEMINI_API_KEY` inherited). **Do NOT hand-edit the CF dashboard** — edit `worker/worker.js` and run the workflow. Routes: `/login /logout /settings /social /s/* /copywriter /transcribe`.
- **CMS (site-wide editable text):** `site-content.js` (in every page `<head>`, in publish allowlist) fetches `gallery-settings.json` and applies `content` overrides on load (fails safe to baked HTML). Editable elements tagged `data-edit="<page>.<section>.<field>"` + `data-edit-label`. Admin 📝 תוכן tab auto-discovers fields per page (`CONTENT_PAGES`). AI (`/copywriter`, `/transcribe`) = **free Google Gemini `gemini-2.5-flash` + `thinkingBudget:0`**.

## Key files

| File | Purpose |
|------|---------|
| `index.html` | Homepage (root = live source) |
| `gallery.html` | Gallery page |
| `styles.css` | Shared CSS (bump `?v=` on every change) |
| `admin.html` | Admin panel (SHA-256 + Worker auth); 📝 תוכן tab = the CMS editor |
| `site-content.js` | CMS applier — applies `content` text overrides on every page |
| `worker/worker.js` | Cloudflare Worker source (repo-managed; deploy via `Deploy Worker` workflow) |
| `.github/workflows/deploy-worker.yml` | Deploys `worker/worker.js` to Cloudflare (manual `workflow_dispatch`) |
| `fix.js` | Instagram sync → R2 → writes root `gallery-data.js` + bumps HTML cache version |
| `.github/workflows/sync-auto.yml` | Runs `fix.js` every 6h (root-only, 120-min timeout) |
| `.github/workflows/publish-public.yml` | One-way mirror: private root → public repo (allowlist) |
| `.well-known/security.txt` | Vulnerability-disclosure contact |

## Credentials (never in repo)

- Instagram: `INSTAGRAM_TOKEN` · R2: `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT`
- Worker password + GitHub token: Cloudflare Worker env vars · Mirror push: `PUBLIC_REPO_TOKEN`
- GA4 Property `536415544` · Measurement `G-68XM6LS4HX` · Cloudflare zone `745a6f759dbdf0930afbf8349d2d4835`
- Cloudflare API token (Transform Rules + Zone Read): provided per-session by user, revoked after. **Never committed.**

## Cloudflare Transform Rules (live, outside git)

Zone `745a6f759dbdf0930afbf8349d2d4835`, ruleset `ea5be0259ede4cf9852576da6ae22df2`:

| Rule | Expression | Effect |
|------|-----------|--------|
| Security Headers | `true` | X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, HSTS max-age=300 |
| No browser cache for HTML | `/` or `*.html` | Cache-Control: no-cache |
