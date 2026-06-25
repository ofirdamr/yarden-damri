# Project Summary — Yarden Damri Website

> Last updated: 2026-06-25 (session 4). **Read this first every new session** (PROGRESS.md only if more detail needed).

---

## ▶ NEXT SESSION — START HERE

**⛔ MODEL: Use Opus.** Sonnet was used this session and caused too many mistakes (wrong branch at start, premature "done", missing SUMMARY.md details, HSTS jumped too early). Start next session on `claude-opus-4-8`.

**⛔ BRANCH (first action, non-negotiable):** run `git branch --show-current`. Work on **`main` ONLY**.
Claude Code on the web opens the session on a `claude/...` branch — **IGNORE THAT**; if not on `main`, `git checkout -B main origin/main`.

**⛔ EDIT THE ROOT FILES.** `preview/` was **deleted (2026-06-24)**. Root `*.html` / `styles.css` / `*.js` ARE the live source. Push to `main` → `publish-public.yml` mirrors to public repo → live site updates.

### ✅ Open / pending tasks (in priority order)

0. **⏳ IN-FLIGHT (session 4): gallery thumbnail backfill.** Goal: every one of the 1548 gallery
   items (301 videos + 1247 images) must have a small `yarden_<id>_thumb.webp` on R2 so the grid
   never loads a full-res file or shows a brown placeholder. Driver: **`backfill-thumbs.js`** via
   workflow **`backfill-thumbs.yml`** (workflow_dispatch). It's **R2-only (no Instagram), data-driven,
   resumable, and does NOT commit** — it only uploads missing thumbs to R2. The frontend grid
   (index.html + gallery.html) **derives** `_thumb.webp` from the id for both images and videos, so
   tiles use the webp automatically as it lands.
   **TO FINISH/VERIFY:** re-run `backfill-thumbs.yml` until its log says `created:0` (fully done).
   Then verify live: a broad random sample of item ids should ALL return 200 for
   `https://images.yardendamri.co.il/yarden_<id>_thumb.webp`, and the gallery grid should show no
   brown/full-res tiles on mobile + desktop. (As of last check ~80% present and climbing.)
   Note: `fix.js` already generates both thumbs for NEW media going forward, so this backfill is a
   one-time catch-up for the existing library.

1. **"Another problem" — UNRESOLVED.** User reported a second bug during hero-video investigation but never named it. I never found it. QA the live site on mobile and desktop: check the lightbox, gallery, and all visible UI for obvious issues.
2. **Bug 2 (lightbox desktop actions) — UNVERIFIED LIVE.** The repositioning JS (`_repositionLbActionsDesktop` / `repositionLbActionsDesktop`) is in the live HTML but was never visually confirmed (Playwright browsers couldn't install in this environment). Verify by opening a gallery item on desktop and confirming the action bar is next to the media, not at screen far-right.
3. **HSTS ramp — on/after 2026-06-28.** HSTS is staged at `max-age=300`. After 2026-06-28, ramp to `max-age=31536000; includeSubDomains; preload` via Cloudflare API (zone `745a6f759dbdf0930afbf8349d2d4835`). Needs user's scoped Cloudflare token → user revokes it immediately after. **Do NOT apply before 2026-06-28.**
4. **First mission for the Hebrew Copywriter** — queued. Model: Sonnet (quality + token efficiency for copy).
5. **Verify Instagram sync runs are clean.** Fix `42ef8ed` is live. Check the 18:00 UTC run on 2026-06-24 via `mcp__github__get_job_logs`, repo `ofirdamr/yarden-damri`.

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
- **Admin settings:** `gallery-settings.json` — written via GitHub API by the Cloudflare Worker (`api.yardendamri.co.il`). Worker writes to the PRIVATE repo.

## Key files

| File | Purpose |
|------|---------|
| `index.html` | Homepage (root = live source) |
| `gallery.html` | Gallery page |
| `styles.css` | Shared CSS (bump `?v=` on every change) |
| `admin.html` | Admin panel (SHA-256 + Worker auth) |
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
