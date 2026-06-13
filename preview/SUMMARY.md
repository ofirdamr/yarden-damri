# Project Summary — June 2026

## Started
Full site rebuild and media migration for yardendamri.co.il (Yarden Damri bridal makeup artist).

## Done
- **Media migration**: Cloudinary → R2 (images: yarden-images, videos: yarden-videos-new)
- **Gallery**: Lazy loading, viewport-only autoplay, PAGE_SIZE=24
- **Instagram sync**: Every 6h via GitHub Actions → fix.js → gallery-data.js + instagram-stats.json
- **Categories/hidden**: Via Cloudflare Worker + gallery-settings.json (GitHub as DB)
- **Admin panel**: Waits for Worker before rendering. Hidden filter shows all items. Hero video picker shows all R2 videos.
- **Hero video**: Plays from gallery-data.js HERO_VIDEO var. Worker updates in background.
- **Likes/comments**: Web-wide via Worker /social endpoint. No localStorage anywhere.
- **Homepage gallery**: Fixed IG likes/comments (getIgStats now checks post_id first). Videos now shown alongside images. Lazy loading confirmed working.

## In Progress
- **Video thumbnails**: _thumb.jpg missing for 161 existing videos (hero has brief dark flash)
- **SEO**: Not complete
- **Security audit**: Not done

## To Do
- Run backfill-thumbs workflow (Actions → Backfill Video Thumbnails → Run)
- SEO completion
- Security audit
- Go-live: promote /preview → root (follow GO-LIVE.md)
- Online reservation system (post-launch)
- Google Places API for live reviews (post-launch)

## Key Architecture

### Media
- Images: `images.yardendamri.co.il` (R2: yarden-images)
- Videos: `videos-new.yardendamri.co.il` (R2: yarden-videos-new)
- Video thumbnails: `images.yardendamri.co.il/yarden_{itemId}_thumb.jpg`

### Data files (repo, served via GitHub Pages)
- `preview/gallery-data.js` — GALLERY_IMAGES array + HERO vars (keyed by item_id, has post_id for stats lookup)
- `preview/instagram-stats.json` — per-post likes/comments counts (keyed by post_id)
- `gallery-settings.json` (root) — admin settings: hidden/pinned/order/cats/heroVideo
- `social.json` (root) — web-wide user likes + comments

### APIs
- Worker: `api.yardendamri.co.il/settings` — admin read/write
- Worker: `api.yardendamri.co.il/social` — public likes+comments
- Instagram Graph API — token in GitHub Secret INSTAGRAM_TOKEN
