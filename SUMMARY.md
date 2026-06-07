# Project Summary — Yarden Damri Website

## Architecture
- **Live site**: root branch (old, still on Cloudinary — not yet replaced)
- **Staging**: `/preview` folder — all active work done here
- **Repo**: github.com/ofirdamr/yarden-damri
- **Admin backend**: yarden-admin.ofirdamr.workers.dev (password: in project instructions)
- **GitHub Pages**: yardendamri.co.il

## Media Stack (Preview folder — current)
| Asset | Storage | Delivery |
|---|---|---|
| Images | Cloudinary (proxied) | ImageKit `ik.imagekit.io/Yardendamri` |
| Videos | Cloudflare R2 `yarden-videos` bucket | ImageKit `ik.imagekit.io/yardenvideos` |

## What Was Done This Session
- Cloudinary deactivating June 9 — full migration completed
- All 1535 images: Cloudinary → ImageKit (via web origin proxy)
- All 289 videos: Cloudinary → Cloudflare R2 → ImageKit yardenvideos account
- `gallery-data.js`: all URLs migrated to ImageKit/R2
- `gallery-settings.json`: all URLs migrated, pushed to repo
- `index.html`, `about.html`, `bride.html`, `bridal-guide.html`: Cloudinary refs removed
- Hero video: fixed, now playing from ImageKit yardenvideos
- Gallery categories: working
- Worker heroVideo: updated via fix-hero.html

## Pending / To Verify
1. **Root files** (live site): still have Cloudinary refs — needs migration when ready to go live with /preview
2. **Render.com**: Instagram feed proxy — URL `yarden-damri.onrender.com` returns 404, needs checking
3. **Instagram token**: appears working (GitHub Action syncs successfully) — verify
4. **fix-hero.html**: should be deleted once confirmed stable
5. **Temp files**: `bride-temp.html`, `index-temp.html`, `pricing-temp.html`, `reviews-temp.html`, `styles-temp.css` — clean up
6. **ImageKit yardenvideos account**: registered under `rifzagury@gmail.com` — document this

## Key Credentials
- ImageKit images: `ik.imagekit.io/Yardendamri` (ofirdamr@gmail.com)
- ImageKit videos: `ik.imagekit.io/yardenvideos` (rifzagury@gmail.com)
- R2 bucket: `yarden-videos`, public URL: `pub-b53972ac15914c24b444efc1a580296e.r2.dev`
- Cloudflare account ID: `1c223389f8a4ebb05eb62cb6a8350924`
