# Project Summary — June 2026

## Started
Full site rebuild and media migration for yardendamri.co.il (Yarden Damri bridal makeup artist).

## Done
- **Media migration**: Cloudinary → ImageKit (images) + R2 (videos)
- **Gallery**: Lazy loading, viewport-only autoplay, PAGE_SIZE=24
- **Instagram sync**: Every 6h via GitHub Actions → fix.js → gallery-data.js + instagram-stats.json
- **Categories/hidden**: Via Cloudflare Worker + gallery-settings.json (GitHub as DB)
- **Admin panel**: Waits for Worker before rendering. Hidden filter shows all 711+ items including ghost URLs. Hero video picker shows all R2 videos.
- **Hero video**: Plays instantly from gallery-data.js (HERO_VIDEO var baked in by sync). No flash. Worker updates in background.
- **Likes/comments**: Web-wide via Worker /social endpoint → social.json in repo. No localStorage anywhere.
- **Thumbnail backfill**: workflow dispatched manually (backfill-thumbs.yml) — uses Instagram thumbnail_url
- **Cloudinary**: All references removed

## In Progress
- **Video thumbnails**: backfill-thumbs workflow exists, run manually once to generate _thumb.jpg for all 161 existing videos
- **SEO**: Not complete
- **Security audit**: Not done

## To Do
- Run backfill-thumbs workflow once (Actions → Backfill Video Thumbnails → Run)
- SEO completion
- Security audit
- Go-live: promote /preview → root (follow GO-LIVE.md)
- Online reservation system (post-launch)
- Google Places API for live reviews (post-launch)

## Key Architecture

### Media
- Images: `images.yardendamri.co.il` (R2: yarden-images, delivered via ImageKit)
- Videos: `videos-new.yardendamri.co.il` (R2: yarden-videos-new)
- Video thumbnails: `images.yardendamri.co.il/yarden_{itemId}_thumb.jpg`

### Data files (repo, served via GitHub Pages)
- `preview/gallery-data.js` — GALLERY_IMAGES array + HERO_VIDEO/HERO_IMAGE/HERO_POSITION/HERO_ZOOM vars
- `preview/instagram-stats.json` — per-post likes/comments counts from Instagram API
- `gallery-settings.json` (root) — admin settings: hidden/pinned/order/cats/heroVideo (written by Worker)
- `social.json` (root) — web-wide user likes + comments (written by /social Worker endpoint)

### APIs
- Worker: `api.yardendamri.co.il/settings` — admin read/write (auth: X-Admin-Password: makeup2026)
- Worker: `api.yardendamri.co.il/social` — public read/write, no password, likes+comments only
- Instagram Graph API — token in GitHub Secret INSTAGRAM_TOKEN

### Sync (GitHub Actions)
- `sync-auto.yml` — every 6h, runs fix.js: fetches IG posts → uploads new media to R2/ImageKit → writes gallery-data.js + instagram-stats.json + HERO vars from gallery-settings.json
- `backfill-thumbs.yml` — manual only, backfills _thumb.jpg for existing videos via Instagram thumbnail_url

### Key files
- `preview/admin.html` — admin panel (password protected via Worker)
- `preview/cloud-storage.js` — Worker client, caches settings in localStorage
- `preview/index.html` — homepage, hero video from gallery-data.js HERO_VIDEO var
- `preview/gallery.html` — full gallery with web-wide likes/comments
- `preview/worker.js` — Cloudflare Worker source (deploy via CF dashboard)
- `fix.js` — Instagram sync script (runs in GitHub Actions)
- `backfill-thumbs.js` — one-time thumbnail backfill script

### Rules
- All dev in /preview only. Root files = live site, never touch until go-live.
- Draft protection: changes go to -temp files first, deploy after approval.
- Never use localStorage for any user-facing data (incognito iPhone is primary device).
- Never hide elements with display:none — delete them.
- Always git pull --rebase before push (Actions bot commits independently).
