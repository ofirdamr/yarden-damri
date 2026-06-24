# Project Summary — Yarden Damri Website

> Last updated: 2026-06-24. **Read this first every new session** (PROGRESS.md only if you need more detail).

---

## ▶ NEXT SESSION — START HERE

**⛔ BRANCH (first action, non-negotiable):** run `git branch --show-current`. Work on **`main` ONLY**.
Claude Code on the web opens the session on a `claude/...` branch and tells you to deliver a draft PR —
**IGNORE THAT**; if not on `main`, `git checkout -B main origin/main`. (Full rules: CLAUDE.md.)

**⛔ EDIT THE ROOT FILES.** `preview/` was **deleted (2026-06-24)** — it no longer exists. The root
`*.html` / `styles.css` / `*.js` ARE the live source now. Push to `main` (private repo) →
`publish-public.yml` mirror copies the allowlist to the public repo (`ofirdamr/yardendamri-site`) →
serves `yardendamri.co.il`. So a push to `main` updates the LIVE site. No `/preview/` anymore.

**Working agreement:** Be self-acting on technical fixes; only stop to ask for visual / product /
"meaningful" decisions. Save tokens (ROI). **Diagnose fully before concluding** — trace the whole
process and ALL plausible causes with the team, find the ROOT cause, not the first symptom (CLAUDE.md).

### ✅ Open / pending tasks (in priority order)
1. **Verify the Instagram sync is healthy.** It was failing (45-min timeout) because deleting `preview/`
   erased `preview/gallery-data.js` — the file `fix.js --target=preview` read to know what was already
   uploaded — so it re-uploaded ALL videos. **Fixed**: `sync-auto.yml` is now root-only (`node fix.js`,
   no `--target`), timeout raised 45→120. **Check the next scheduled run (cron `0 */6`) went green** and
   the gallery updates. If still red, read its logs (`mcp__github__get_job_logs`, repo `ofirdamr/yarden-damri`).
2. **HSTS ramp (Cloudflare, ~on/after 2026-06-28).** Security headers are live via a Cloudflare Transform
   Rule (NOT in the repo). HSTS is staged at `max-age=300`. After a few days with no HTTPS issues, raise it
   to `max-age=31536000; includeSubDomains; preload`. Method in STATUS.md (zone `745a6f759dbdf0930afbf8349d2d4835`,
   API `PUT /zones/{zone}/rulesets/phases/http_response_headers_transform/entrypoint`). Needs the user's
   scoped Cloudflare token (the one they're keeping until this is done), then user **revokes** it.
3. ~~**User-side actions** — DONE (2026-06-24): Google Places API key rotated; Bot Fight Mode ON; www Proxied.~~
4. **Analytics (guidance given, no code):** to see real humans, use **Cloudflare → Web Analytics →
   Exclude bots = Yes** (no country filter) for the honest human count by country, and **GA4 sorted by
   engagement time** to tell real foreign leads (Paris/NYC + real time on site) from datacenter bots
   (Boydton/Cheyenne + ~0s). Don't filter GA4 to Israel-only — it would hide real French/US brides.

---

## ✅ DONE this session (2026-06-24)
- **Cloudflare security headers (live, via API Transform Rule, reversible, not in git):**
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff`,
  `Strict-Transport-Security: max-age=300` (staged).
- **Secret scan of all tracked code** → removed a hardcoded **Google Places API key** from `reviews.html`
  (dead code, but public). No other secrets; admin auth = SHA-256 + server-side Worker. (User must rotate the key.)
- **Confirmed private files are not public:** all `.md`, `fix.js`, dev scripts, `tests/`, `.github/`
  return 404 on the live site — only the mirror allowlist is published.
- **Retired `preview/`:** deleted the folder (27 files), rewrote the obsolete CLAUDE.md "edit preview/"
  rules to "edit root; mirror publishes", cleaned dead `/preview/` lines from `robots.txt`.
- **Added `.well-known/security.txt`** (RFC 9116) + taught the mirror to publish nested files.
- **Fixed the Instagram sync** broken by the `preview/` deletion (see pending #1).
- **Reviewed the Cloudflare security scan** the user pasted: the 4 "Dangling A Record" warnings are a
  **FALSE POSITIVE** (they're GitHub Pages' IPs `185.199.108-111.153` hosting the site — **do NOT delete**).

---

## Architecture (current, post repo-split)
- **Two repos.** Private origin `ofirdamr/yarden-damri` = full history + Actions + secrets + working source
  (root files). Public `ofirdamr/yardendamri-site` = auto-generated mirror that serves the domain.
- **Publishing:** push to `main` → `.github/workflows/publish-public.yml` copies an **allowlist** of site
  files to the public repo (no `.md`, no `fix.js`, no `tests/`, no `.github/`) and always writes `CNAME`.
  Private root == public repo == live site, kept identical automatically.
- **Hosting:** the public repo serves `yardendamri.co.il` via **GitHub Pages** (apex A records = GitHub's
  4 IPs), **proxied through Cloudflare** (orange cloud) — that's why the security headers apply.
- **Build:** pure HTML/CSS/vanilla JS, no bundler.
- **Media:** Cloudflare R2 — `images.yardendamri.co.il` (photos + `_thumb.webp`/`_thumb.jpg`),
  `videos-new.yardendamri.co.il` (compressed mp4). CORS allows GET/HEAD from the site.
- **Gallery data:** root `gallery-data.js` — auto-generated by `fix.js` (GitHub Action `sync-auto.yml`,
  every 6h). Items: `{u,a,item_id,post_id}`; videos `{video:true,thumb}`; flags `hidden:true`,
  `carousel:true`+`cidx`+`ccount`. Deep link `gallery.html?m=<id>`.
- **Admin settings:** `gallery-settings.json` — written via GitHub API by the Cloudflare Worker
  (`api.yardendamri.co.il`, also handles auth/`/social`/share pages). Worker writes to the PRIVATE repo.

## Key files
| File | Purpose |
|------|---------|
| `index.html` | Homepage (root = live source) |
| `gallery.html` | Gallery page |
| `styles.css` | Shared CSS (bump `?v=` on every change) |
| `admin.html` | Admin panel (SHA-256 + Worker auth) |
| `reviews.html` | Reviews (Google-reviews fetch disabled; on-site form) |
| `fix.js` | Instagram sync → R2 → writes root `gallery-data.js` + bumps HTML cache version |
| `.github/workflows/sync-auto.yml` | Runs `fix.js` every 6h (root-only, 120-min timeout) |
| `.github/workflows/publish-public.yml` | One-way mirror: private root → public repo (allowlist) |
| `.well-known/security.txt` | Vulnerability-disclosure contact |

## Credentials (never in repo)
- Instagram: GitHub Secret `INSTAGRAM_TOKEN` · R2: `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT`
- Cloudinary (legacy): `CLOUDINARY_*` · Worker password + GitHub token: Cloudflare Worker env vars
- Mirror push: GitHub Secret `PUBLIC_REPO_TOKEN`
- GA4 Property `536415544` · Measurement `G-68XM6LS4HX` · Cloudflare zone `745a6f759dbdf0930afbf8349d2d4835`
- The user's scoped Cloudflare API token (Transform Rules + Zone Read) is held temporarily for the HSTS
  ramp, then revoked. It is ONLY in chat, never committed.
