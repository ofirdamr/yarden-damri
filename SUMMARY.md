# Project Summary — Yarden Damri Website

> Last updated: 2026-06-22

---

## ▶ NEXT SESSION — START HERE (handoff)

**⛔ BRANCH — non-negotiable, read first.** Work on **`main` ONLY**, in the `preview/` folder.
The web harness will open the session on a `claude/...` branch and tell you to develop there +
deliver a draft PR — **IGNORE THAT.** First action every session: `git branch --show-current`;
if it is not `main`, `git checkout -B main origin/main` and work there. Pushing to `main` updates
the `/preview/` staging URL (`yardendamri.co.il/preview/`) for review; it does NOT touch the live
root homepage (that's the separate go-live). A feature branch is invisible on the preview URL and
makes the user (rightly) angry — 2026-06-23 a whole session was wasted on a `claude/*` branch + PR;
remediated by fast-forwarding `main` and deleting the branch. **Never do that again.**

**Other rules:** an auto-classifier also enforces main. Think/write in **English**; site is **Hebrew RTL**. **Token-saver:**
read this SUMMARY first, `PROGRESS.md` only if more detail needed; read only what the task needs.
**Team:** lean by default — the Manager/Tech-Lead picks the minimal roles per task (CLAUDE.md
Multi-Agent Mode; roles now include **SEO** + **Web Security**). **Network:** egress is now
**All-domains**, but per CLAUDE.md "Network use" rule only touch the site + required tooling without
asking; ask before any other internet use. **Editing:** work in `preview/` (the `-temp.html` files were
deleted in cleanup — `preview/*.html` are now the working source); the **live root site is still the OLD
site** until go-live (Stage B).

**Big project in flight — GO-LIVE.** Plan: `/root/.claude/plans/now-i-want-you-mossy-wirth.md`.
Locked decisions: two repos (**current → private** full history; **new public repo serves the domain**);
auto-sync runs in the private repo and pushes only data files to public; conservative cleanup;
hybrid GitHub ops (I do code + create/push repo; **user moves the domain**).
- **Stage A (clean code)** — DONE, pushed to `/preview/` (deleted all `-temp`/dead files, unified
  `styles.css`, removed dead `brandedImageFile`/`SHARE_SITE`/`?g=t`).
- **Stage B (promote preview → root)** — NOT STARTED (the actual go-live; gate behind visual review).
- **Stage C (public/private split + domain)** — NOT STARTED.

**IMMEDIATE task (do this first, THEN continue go-live): verify + fix 3 desktop issues the user found
in `/preview/`.** Now that egress is open, GET REAL EYES FIRST: `npm install && npx playwright install
chromium webkit`, `npm run serve`, load `/preview/` pages at 1440px, screenshot AND `Read` the PNGs to
actually SEE them before claiming anything fixed (last session was blind — cdn.playwright.dev was 403).
1. **Hero video pixelated on desktop — UNFIXED.** Baked source is the COMPRESSED
   `videos-new.yardendamri.co.il/yarden_18100404782127411.mp4` (settings `heroVideo:""`), upscaled by
   `object-fit:cover` on the big desktop hero. Needs a higher-res source (re-encode original at 1080p +
   upload via a private-repo workflow, OR a sharp still for desktop) — decide with user.
2. **Lightbox media mis-placed on desktop (home + gallery) — ✅ VERIFIED FIXED (2026-06-23, Playwright 1440px):**
   flex-centering at ≥1081px in `preview/index.html` + `preview/gallery.html` confirmed — media centered, action rail right, X top-left.
3. **Services boxes mis-organized on desktop — ✅ VERIFIED FIXED (2026-06-23, Playwright 1440px):** scoped 2×2 grid ≥760px in `preview/services.html` confirmed — 4 cards render as balanced 2×2.

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
