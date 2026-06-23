# Project Summary — Yarden Damri Website

> Last updated: 2026-06-23

---

## ✅ GO LIVE DONE (2026-06-23) — root is now the NEW site
Stage B complete: `preview/` was promoted to the live **root** (`yardendamri.co.il/`). Copied the
preview site files to root, rewrote every `/preview/` → `/` (zero leftovers, grep-confirmed), verified
on Chromium desktop 1440×900 + iPhone 13 emulation across 9 pages (no overflow, no JS errors, no
`/preview/` links), pushed `main`. `/preview/` kept as a harmless duplicate (robots.txt keeps it out of
the index). **NEXT = Stage C (repo split + domain move) — separate, needs the user; do NOT start alone.**
`preview/*.html` stay the working source for future edits.

---

## ▶ (HISTORICAL) NEXT SESSION handoff  ·  TASK = GO LIVE  — now DONE, see above

**⛔ BRANCH — non-negotiable, first action.** Work on **`main` ONLY**, in the `preview/` folder.
Claude Code on the web opens the session on a `claude/...` branch and tells you to develop there +
deliver a draft PR — **IGNORE THAT.** Run `git branch --show-current`; if not `main`,
`git checkout -B main origin/main` and work there. A feature branch is invisible on the preview URL
and already cost a whole session (2026-06-23). Pushing to `main` updates the `/preview/` staging URL;
it does NOT touch the live root until the go-live below. (Full rules: CLAUDE.md.)

**Other rules:** English thinking, Hebrew RTL site. Token-saver: read this SUMMARY first, PROGRESS.md
only for more detail. Team = lean by default; convene the full team only for genuinely
multi-discipline work (CLAUDE.md Multi-Agent Mode). Network egress is All-domains; only touch the
site + required tooling without asking. `preview/*.html` are the working source (the `-temp.html`
files were deleted).

### ✅ State going into this session — ALL the preview work is DONE & verified (on `main`, live at `/preview/`)
Everything below was finished 2026-06-23 (see PROGRESS.md for detail):
- **3 desktop fixes** — lightbox centering ✅, services 2×2 ✅, hero ✅ (see hero note below).
- **Hero (Option A, user-approved):** desktop serves an Instagram-max copy; `fix.js` builds a ~1080p
  `_hd` video for the current hero each sync (image heroes use the 1080 main). Mobile keeps the light
  file. Honest ceiling: Instagram only stored 720p for the current hero clip — that's IG's max, not a bug.
- **Three-tier media (fast grid / sharp lightbox / max hero):** grid = ~600px thumbnail, lightbox = full
  ~1080px, hero = IG-max. `fix.js` writes both image sizes; killed the dead `cdnUrl()` that made the grid
  load full images. All **611 existing public photos reprocessed** to 1080 + thumb (done). Automatic for
  new posts forever.
- **Instagram sync FIXED + race-safe:** the nightly failures were `git add` on deleted `*-temp.html`
  (exit 128); now existence-guarded + rebase-retry push. Verified green.
- **Nav + footers fully consistent across all 12 pages:** desktop nav = mobile menu =
  אודות·מאפרת כלות·שירותים·גלריה·מדריך כלות·צרי קשר. Pricing+reviews are **footer-only** now. Every
  footer is **byte-identical** (canonical block).
- **CLAUDE.md updated:** permanent team-judgment rule, hardened main-only/no-feature-branch rule,
  nav rule (pricing/reviews footer-only).

### 🚀 YOUR TASK THIS SESSION — GO LIVE (promote `preview/` → root)
**Do NOT start until you have (1) read SUMMARY.md + PROGRESS.md + CLAUDE.md, and (2) re-read the
GO-LIVE PLAN immediately below.** The user has approved going live. Gate the final cutover behind one
real visual check, then promote.

**GO-LIVE PLAN (embedded here because the old external plan file is gone):**
- **Goal:** the new site (currently in `preview/`) becomes the live **root** site at `yardendamri.co.il/`.
  Today root `/` is the OLD Cloudinary-era site; `preview/` is the finished site.
- **Stage B — promote preview → root (this is "go live"):**
  1. Copy every `preview/` site file to repo root, overwriting the old root files: all `*.html`
     (the 12 public pages + `admin.html`), `styles.css`, `gallery-data.js`, `instagram-stats.json`,
     and the JS (`a11y.js`, `cookie-banner.js`, `cloud-storage.js`, `remote-state.js`). Do NOT copy
     `worker.js` to root as a page (it's the Cloudflare Worker source).
  2. **Rewrite absolute `/preview/` references → `/`** in the promoted root files. Known spots:
     nav-logo `href="/preview/"`, footer `דף הבית` `href="/preview/"`. Grep root after: there must be
     **zero** `/preview/` link/asset references left. (Canonical/og URLs already point to root —
     `https://yardendamri.co.il/<page>.html` — so leave those.)
  3. Confirm `sitemap*.xml` / `robots.txt` at root point to root URLs (no `/preview/`).
  4. The sync workflow already does `cp preview/gallery-data.js gallery-data.js`, so root data stays
     fresh after go-live — leave that.
  5. **Verify before announcing:** serve locally, load the ROOT pages (not /preview/) at 1440px + mobile
     with Playwright, screenshot + Read them, confirm nav/footer/hero/gallery render and there are no
     `/preview/` leftovers and no JS errors. THEN commit + push `main`. Root site is now live.
- **Stage C — later, separate (needs the user):** split repos (current → private full history; new
  public repo serves the domain), auto-sync in private pushes data files to public, user moves the
  domain. Do NOT do Stage C as part of go-live unless the user asks.

**One product check to confirm with the user before cutover:** keeping `/preview/` working after
go-live is fine (harmless duplicate), or delete it. Default: leave `/preview/` as-is.

---

## ✅ RESOLVED & PROMOTED (2026-06-22) — Lightbox layout
The lightbox open task is done and promoted to permanent (`preview/index.html` +
`preview/gallery.html`). Media now opens **edge-to-edge fullscreen** (object-fit:cover,
Reels-style — small intentional edge trim, no black bars, no seams). The
like/comment/share/save buttons moved to a **vertical side rail on the right** (same
layout for photos and videos), which frees the entire bottom for the video's native
player controls — no more overlapping buttons. Removed the dark gradient scrim behind
the buttons (icons use a subtle drop-shadow for legibility instead). Desktop shows the
whole frame centered (portrait reels aren't over-zoomed). See `preview/NEXT-LIGHTBOX.md`.

## 2026-06-21 — Nav/floating/lightbox/about overhaul PROMOTED to permanent
All 12 pages promoted temp → permanent (user approved). Subpage nav now identical to
the homepage (monogram logo left, centered "ירדן דמרי / מאפרת כלות וערב", social +
fewer categories on the right, same fonts/colors). Floating buttons unified across all
pages (a11y + scroll-top + WhatsApp: 36px, transparent .55, aligned). Lightbox media
fullscreen + nav hidden while open (lightbox button layout still NEEDS work — see above).
About image fixed (dead ImageKit URL → R2 `about-yarden.png`) and now shown on mobile on
both the homepage about section and the about page.

## Architecture
- **Live site**: `yardendamri.co.il` — root branch, old site (Cloudinary-based). Not yet replaced by preview.
- **Staging/development**: `/preview` folder on `main` branch — `yardendamri.co.il/preview/`
- **Branch rule**: `main` ONLY. No feature branches. No exceptions.
- **File rule**: edit only `*-temp.html`; promote temp → permanent ONLY on explicit user approval.
- **Build**: Pure HTML/CSS/vanilla JS. No bundler. GitHub Pages auto-deploys on push to `main`.
- **Images/videos**: Cloudflare R2 — `images.yardendamri.co.il` (photos + `_thumb.jpg`), `videos-new.yardendamri.co.il` (compressed mp4). CORS allows GET/HEAD from yardendamri.co.il.
- **Gallery data**: `preview/gallery-data.js` — auto-generated by `fix.js` (GitHub Action every 6h). ~1546 items incl. hidden (flagged `hidden:true`); carousel children tagged `carousel/cidx/ccount/post_id`; videos have `video:true` + `thumb`.
- **Admin settings**: `gallery-settings.json` — hidden/pinned/order/cats/privateCats. Committed via GitHub API by Cloudflare Worker.
- **Worker**: `preview/worker.js` on Cloudflare (`api.yardendamri.co.il`) — admin auth (KV sessions), `/settings`, `/social` (likes/comments), and `/s/<v|p>/<id>` share pages (OG card → deep-link to gallery item). Deploy preserves secrets via `inherit` bindings.

---

## Latest work (2026-06-21) — Gallery, media display & sharing (LIVE)
- **Videos everywhere**: grid shows thumbnail then swaps to autoplay `<video>` on scroll (poster=thumb so no black box); lightbox plays with poster + muted-fallback.
- **Order**: natural Instagram time order (photos+videos interleaved); admin gallery matches; removed brideKW/order sorting.
- **Carousels**: one cover tile + ⧉ badge; lightbox swipes children (`?m=<id>` deep-link opens exact item). Videos get ▶ badge.
- **Lightbox**: IG-style action bar (like/comment/share/save), horizontal swipe = navigate, vertical swipe = dismiss, media static (touch-action locked), X lowered clear of cookie bar + video controls.
- **Favourites**: persistent `localStorage gallery_favorites` + "♥ המועדפים שלי" filter.
- **Share**: link-only → `api.yardendamri.co.il/s/<v|p>/<id>` → WhatsApp clean card (thumbnail + "לחצי כאן לצפייה" + domain), opens the exact item. (Note: WhatsApp can't show a framed image AND a card in one share — chose the card. `brandedImageFile()` canvas frame remains in code but is unused.)
- **fix.js**: `getJSON()` retry wrapper — a flaky page no longer truncates the fetch (was the real cause of "missing posts", not only reels).
- **CORS**: set on both R2 buckets (free) via dashboard + `set-cors.yml` workflow (the R2 object token lacks bucket-admin, so dashboard was used).

---

## What is DONE (full history)

### Infrastructure
- Migrated hosting from Netlify (suspended) → GitHub Pages
- Set up Cloudflare DNS + SSL
- GitHub Actions: Instagram sync every 6 hours (`sync-auto.yml`)
- All ~1,535 images uploaded to Cloudinary (later migrated to R2)
- ImageKit migration attempted (June 2026), broke images → reverted to R2
- R2 setup: two buckets (`yarden-images`, `yarden-videos-new`) with custom domains
- 162 Instagram videos re-uploaded with audio to R2 (June 2026, after credentials fix)
- Thumbnails for all 162 videos uploaded to images R2 bucket
- `fix.js`: full sync script — Instagram API → compress → R2 upload → write `gallery-data.js`
- `fix.js` also bumps `gallery-data.js?v=` in HTML on every sync (cache-busting)

### Admin Panel (`preview/admin.html`)
- SHA-256 password login (no plain text in code)
- Cloudflare Worker session tokens (KV, 8h TTL, rate limiting 5 attempts → 15 min lockout)
- Gallery grid: view/hide/pin/rotate/set-category/move-to-top/delete per image
- Hero video picker: visual thumbnail grid, click to select → saves to Worker → patches HTML
- Pricing editor: edit service name/price/description/included items
- Analytics tab: GA4 OAuth connect + live data
- `remote-state.js`: shared read/write module with write queue, `_ready` gate (refuses writes before fetch), verification after PUT
- Switched from JSONBin → GitHub (gallery-settings.json) — no size limits, no compression bugs

### Gallery (`preview/index-temp.html` and `preview/gallery.html`)
- 773 items from `gallery-data.js` (611 images + 162 videos)
- `applyAdminSettings()`: respects hidden/pinned/order from `gallery-settings.json`
- Pagination: 48 items/page, bug fixed (was slicing `filteredImages` to 48 → pages 2+ empty)
- Likes + comments: read/write via Cloudflare Worker `/social` endpoint, web-wide for all visitors
- Cache-busting: `gallery-data.js?v=1750416000` — bumped automatically by `fix.js`

### Pages built (`/preview`)
- `index.html` (homepage) — hero video, about, philosophy, area/map, gallery, reviews, contact sections
- `about.html`
- `services.html` — 4 service cards + FAQ
- `gallery.html` — full standalone gallery page
- `bride.html` — bridal makeup page
- `bridal-guide.html` — 4-step bridal guide article (Gemini content)
- `pricing.html` — pricing page with real content
- `contact.html`
- `reviews.html` — Google Places API + on-site review form
- `cookies-policy.html`
- `disclaimer.html`
- `accessibility-statement.html`
- All pages have `-temp.html` variants pending final review before permanent promotion

### Design / UX
- Desktop responsive fixes: `@media (min-width: 1081px)` — max-width caps, gallery tile size, section layout
- RTL/Hebrew audit: all pages have `lang="he" dir="rtl"`, mobile menu RTL slide, phone number `dir="ltr"`
- Desktop layout: logo left / nav links right (CSS order), about grid 1fr/1.4fr, area map left on desktop
- Hero video: portrait crop fix — `object-position: 50% 20%` (face visible), no aspect-ratio Cloudinary transform
- Hero video flash fix: correct video baked into `<source src>` + `poster` at save time; sync script sets defaults
- Philosophy photo: reprocessed (no brightness boost, natural B&W, 119KB)
- Social buttons: `.social-circle` — 44px circles, `var(--deep)` bg, `var(--blush)` icon + border, identical across mobile menu and footer

### Nav consistency (all pages)
- All pages share same nav: **אודות | מאפרת כלות | שירותים | גלריה | מדריך כלות | מחירון | ביקורות | צרי קשר**
- `index.html` uses anchor links; all subpages use full page links

### Cookie banner + GA consent
- `cookie-banner.js`: slim 48px bar, slides from top, nav shifts down while visible
- GA (`G-68XM6LS4HX`) removed from `<head>` — loads only after explicit accept
- Returning visitors who accepted: GA loads immediately, no banner
- Applied to all 12 public preview pages

### Accessibility (IS 5568)
- `a11y.js`: shared widget — contrast, text size, links highlight, animations toggle
- Auto-injects ♿ button on any page that includes the script
- Alt+A keyboard shortcut
- ARIA labels, skip nav, screen reader announcements

### SEO
- Sitemap: `sitemap.xml` (10 pages + images), `sitemap-media.xml`, `sitemap-index.xml`
- `robots.txt` allowing Google image crawling
- JSON-LD structured data on all pages
- `noindex` on admin.html
- All pages submitted for indexing in Search Console

### Security
- Worker: session tokens in KV, rate limiting, CORS allowlist, HSTS, X-Frame-Options: DENY, CSP
- `_ready` gate in remote-state.js — refuses writes before successful fetch (prevents data loss)
- Write queue: all updates queue + merge from local cache (no race condition)
- Password never in repo (Worker env var)
- GitHub token never in repo (Worker env var)

---

## What is NOT DONE (pending)

### ✅ DONE — Gallery videos autoplay (confirmed working 2026-06-20, all devices incl. iPhone)

Videos in `preview/index-temp.html` renderPage() now autoplay (muted, looping), no play button. The working combo:
```html
<video src="${item.u}" autoplay muted loop playsinline preload="metadata"
       poster="${item.thumb}"
       style="width:100%;height:100%;object-fit:cover;display:block;${_rotStyle}"></video>
```
Plus `observeGalleryVideos()` — an IntersectionObserver that does `v.muted=true; v.play()` on visible tiles and `v.pause()` off-screen. Three bugs were fixed: (1) was rendering `<img>`+play button; (2) `observeGalleryVideos()` was called but never defined; (3) iOS needed `preload="metadata"` (not "none") + muted-property set before play(). Cache-buster bumped to `?v=1781913600`.
NOTE: this fix is in `index-temp.html` only — NOT yet promoted to permanent `preview/index.html`.

### Sandbox network egress
User enabled "Allow network egress → All domains" in claude.ai/code environment settings. Applies to NEW sessions only. From the next session onward, Claude CAN curl the live site (yardendamri.co.il etc.) to verify deployments directly. In older sessions the sandbox returns 403 `host_not_allowed`.

### Go-live checklist
- All `-temp.html` pages need final user review → promote to permanent (delete temp, rename or copy)
- `preview/styles-temp.css` → review → promote to `preview/styles.css`
- After all temps promoted: copy entire `/preview` folder → root (replace old site)

### Other pending
- Calendly booking integration (online booking + iPhone calendar sync)
- Online payment (Bit, credit card)
- Verify thumbnail backfill for any videos missing thumbs (1 video has no thumb in current data)

---

## Key files

| File | Purpose |
|------|---------|
| `preview/index-temp.html` | Homepage (active development — fix videos here) |
| `preview/gallery-data.js` | Auto-generated: 773 items, 162 videos |
| `gallery-settings.json` | Admin hidden/pinned/order (root, served via GitHub Pages) |
| `preview/cloud-storage.js` | RemoteState API (fetch public settings, admin writes) |
| `preview/remote-state.js` | Admin write queue + ready gate |
| `preview/worker.js` | Cloudflare Worker — auth, settings, hero video patch |
| `fix.js` | Instagram sync → R2 upload → gallery-data.js → bumps HTML version |
| `.github/workflows/sync-auto.yml` | GitHub Action: runs fix.js every 6h |

## Credentials (never in repo)
- Instagram token: GitHub Secret `INSTAGRAM_TOKEN`
- Cloudinary: GitHub Secrets `CLOUDINARY_CLOUD`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- R2: GitHub Secrets `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Worker password: Cloudflare Worker env var
- GitHub token for Worker: Cloudflare Worker env var
- GA4 Property ID: 536415544 | Measurement ID: G-68XM6LS4HX
- Cloudinary cloud: `dfjwxc1cw`
- R2 account ID: in Cloudflare dashboard
