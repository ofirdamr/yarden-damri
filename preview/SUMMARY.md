# Project Summary — June 2026

## Started
Full site rebuild and media migration for yardendamri.co.il (Yarden Damri bridal makeup artist).

## Done
- **Media migration**: Cloudinary → R2 (images: `images.yardendamri.co.il`, videos: `videos-new.yardendamri.co.il`)
- **Compression**: Images → WebP 800px, Videos → H.264 720p via ffmpeg on upload
- **Gallery**: Lazy loading, viewport-only autoplay, PAGE_SIZE=24
- **Instagram sync**: Every 6h, skips existing, only uploads new posts, no hang
- **Likes/comments**: Fixed — removed sessionStorage (broken in incognito iPhone), fetch fresh every load
- **Stats**: 1608 post IDs fetched including old carousel children
- **Categories/hidden**: Working via Cloudflare Worker + gallery-settings.json
- **Root ↔ Preview sync**: gallery-data.js and instagram-stats.json auto-copied on every sync
- **Cloudinary**: All references removed from codebase
- **ARCHITECTURE.md**: Created documenting full system
- **Admin panel**: Video thumbnails fallback to video element when _thumb.jpg missing

## In Progress
- **Hero video**: Admin can pick any video, but video thumbnails not generated yet for existing videos → admin picker shows black tiles. _thumb.jpg files will be generated on next new video upload.
- **Hero flash**: Still shows brief dark screen before video plays (no poster image available for existing videos)

## To Do
- Generate _thumb.jpg for all existing videos in R2 (needs one sync run with ffmpeg working)
- Hero video shows instantly from first frame (blocked by missing thumbnails)
- Site responsiveness / image sizing on desktop
- SEO completion
- Security audit  
- Go-live: promote /preview → root (follow GO-LIVE.md)
- Online reservation system (post-launch)
- Google Places API for live reviews (post-launch)

## Key Architecture
- Images: `images.yardendamri.co.il` (R2 bucket: yarden-images)
- Videos: `videos-new.yardendamri.co.il` (R2 bucket: yarden-videos-new)
- Video thumbnails: `images.yardendamri.co.il/yarden_{itemId}_thumb.jpg`
- Worker: `api.yardendamri.co.il/settings` (auth: X-Admin-Password: makeup2026)
- Sync: GitHub Actions → fix.js → R2 + preview/gallery-data.js + instagram-stats.json
