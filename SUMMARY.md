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
1. **Verify Instagram sync next run went green.** Fix committed (`42ef8ed`, 2026-06-24 15:24 UTC). The two
   failed runs (09:35, 14:36) used the old broken workflow (pre-fix). The fix: root-only `node fix.js`,
   timeout 45→120 min, `gallery-data.js` correct (1547 items, all R2 URLs). Next scheduled run is 18:00 UTC —
   check it went green. If not, read logs via `mcp__github__get_job_logs`, repo `ofirdamr/yarden-damri`.
2. **HSTS ramp (Cloudflare, ~on/after 2026-06-28).** HSTS staged at `max-age=300`. After a few days with
   no HTTPS issues, raise to `max-age=31536000; includeSubDomains; preload`. Zone `745a6f759dbdf0930afbf8349d2d4835`,
   API `PUT /zones/{zone}/rulesets/phases/http_response_headers_transform/entrypoint`. Needs user's scoped
   Cloudflare token → after applying, user revokes it.
3. ~~**User-side actions** — DONE (2026-06-24): Google Places API key rotated; Bot Fight Mode ON; www Proxied.~~
4. **First mission for the Hebrew Copywriter** — queued for next session. Model: Sonnet.
5. **Analytics (guidance given, no code):** Cloudflare → Web Analytics → Exclude bots = Yes for real human
   count; GA4 sorted by engagement time to separate real foreign leads from datacenter bots.

---

## ✅ DONE this session (2026-06-24, session 2)
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

## ✅ DONE this session (2026-06-24, session 2)
- **Diagnosed Instagram sync redundant re-uploads:** root cause = fix commit `42ef8ed` landed at 15:24 UTC
  but the two failed runs (09:35, 14:36) used commit `ca84125` (pre-fix). They re-uploaded all 1547 items
  because `preview/gallery-data.js` was gone → `existingById` empty. Fix is now live; next run will be clean.
  Re-uploads did NOT change video quality (same CRF 28 / 720p settings; `_hd.mp4` files untouched).
- **Confirmed user-side security actions done:** Google Places API key rotated, Bot Fight Mode ON, www Proxied.
- **Added Professional Hebrew Copywriter to CLAUDE.md team roles.** Recommended model: Sonnet (quality +
  token efficiency; Haiku too weak for nuanced Hebrew, Opus overkill for copy).

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
