# Project Summary — Yarden Damri Website (Preview)

## Architecture
- **Staging**: `/preview` folder on `main` branch → served at `yardendamri.co.il/preview/`
- **Live site (root)**: old version, still on Cloudinary — not yet replaced
- **Repo**: github.com/ofirdamr/yarden-damri
- **Admin API**: `api.yardendamri.co.il` (Cloudflare Worker, password in project system prompt)

## Media Stack
| Asset | Storage | Delivery |
|---|---|---|
| Images | Cloudflare R2 `yarden-images` | `images.yardendamri.co.il` |
| Videos | Cloudflare R2 `yarden-videos-new` | `videos-new.yardendamri.co.il` |
| Video thumbnails | Cloudflare R2 `yarden-images` | `images.yardendamri.co.il/yarden_{id}_thumb.jpg` |

## Done
- Full site redesign (index, about, services, bride, bridal-guide, contact, pricing, gallery, reviews)
- Media migration: Cloudinary → R2 (images WebP 800px, videos H.264 720p)
- Instagram sync every 6h: fix.js → gallery-data.js + instagram-stats.json
- Admin panel: categories, hidden, pinned, hero video, web-wide likes/comments
- Cookie consent banner (`cookie-banner.js`) on all 12 public pages — one-time, localStorage
- Cookies policy page (`cookies-policy.html`) — full Hebrew, matches site style

## To Do Before Go-Live
1. Backfill `_thumb.jpg` for 161 existing R2 videos (hero dark flash)
2. SEO: meta tags, sitemap, structured data
3. Security audit
4. Clean up all `-temp` files
5. Promote `/preview` → root (follow GO-LIVE.md)

## Post-Launch
- Online reservation system
- Google Places API for live reviews

## Key Credentials
- R2 images: `images.yardendamri.co.il` (bucket: `yarden-images`)
- R2 videos: `videos-new.yardendamri.co.il` (bucket: `yarden-videos-new`)
- Cloudflare account ID: `1c223389f8a4ebb05eb62cb6a8350924`
- GA4 Measurement ID: `G-68XM6LS4HX`
- ImageKit images: `ik.imagekit.io/Yardendamri` (ofirdamr@gmail.com) — suspended, not in use
- ImageKit videos: `ik.imagekit.io/yardenvideos` (rifzagury@gmail.com) — suspended, not in use
