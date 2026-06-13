# Project Summary — Yarden Damri Website

## Architecture
- **Live site**: root branch (old, still on Cloudinary — not yet replaced)
- **Staging**: `/preview` folder — all active work done here
- **Repo**: github.com/ofirdamr/yarden-damri
- **Admin backend**: `api.yardendamri.co.il` (Cloudflare Worker `yarden-admin`)
- **GitHub Pages**: yardendamri.co.il

## Media Stack (Preview — current)
| Asset | Storage | Delivery |
|---|---|---|
| Images | Cloudflare R2 `yarden-images` | `images.yardendamri.co.il` |
| Videos | Cloudflare R2 `yarden-videos-new` | `videos-new.yardendamri.co.il` |
| Video thumbnails | Cloudflare R2 `yarden-images` | `images.yardendamri.co.il/yarden_{id}_thumb.jpg` |

## What Was Done (2026-06-13)
- **Admin security refactor** — replaced raw password header with session token auth:
  - Worker: `POST /login` issues KV token (8h), `POST /logout` revokes it, rate limiting (5 fails → 15-min lockout)
  - cloud-storage.js: login/logout flow, `Authorization: Bearer <token>` on all writes
  - admin.html: `tryLogin()` calls server, handles 429/401/network errors in Hebrew
  - deploy-worker.yml: GitHub Actions CI/CD via Cloudflare REST API + `CF_WORKERS_API_TOKEN` secret
  - All `-temp` files promoted to permanent and deleted

## Pending / To Do
1. Backfill `_thumb.jpg` for 161 existing R2 videos (hero dark flash)
2. SEO: meta tags, sitemap.xml, structured data
3. Promote `/preview` → root (follow GO-LIVE.md)
4. Online reservation system (post-launch)
5. Google Places API for live reviews (post-launch)

## Key Credentials
- R2 images: `images.yardendamri.co.il` (bucket: `yarden-images`)
- R2 videos: `videos-new.yardendamri.co.il` (bucket: `yarden-videos-new`)
- Cloudflare account ID: `1c223389f8a4ebb05eb62cb6a8650924`
- KV `yarden-admin-sessions` ID: `7fc38ac017a145fea0a486419a3bff07`
- GA4: `G-68XM6LS4HX`
- GitHub secret `CF_WORKERS_API_TOKEN`: deploy Worker via Actions
