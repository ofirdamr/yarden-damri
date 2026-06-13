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

## What Was Done This Session (2026-06-13)
- **Cookies Policy page** (`preview/cookies-policy.html`) — full Hebrew policy, matches site style
  - Covers: Essential / Analytics (Google Analytics GA4) / Marketing (Meta Pixel) / Instagram API / Google Reviews
  - Table with 3 categories, browser opt-out links, Israeli privacy law consent statement
- **Cookie consent banner** (`preview/cookie-banner.js`) — shared script loaded on all 12 public pages
  - Slim frosted-dark bar (charcoal `#111111` + gold `#B89060` accent — preview palette)
  - Appears once on first visit to any page (direct URL, Google search, any entry point)
  - Accept / Decline → saved to `localStorage('cookie_consent')` → never shown again
  - Links to `cookies-policy.html` for full policy

## Pending / To Verify
1. **Root files** (live site): still have Cloudinary refs — needs migration when ready to go live with /preview
2. **Render.com**: Instagram feed proxy — URL `yarden-damri.onrender.com` returns 404, needs checking
3. **Instagram token**: appears working (GitHub Action syncs successfully) — verify
4. **fix-hero.html**: should be deleted once confirmed stable
5. **Temp files to clean up**: `bride-temp.html`, `index-temp.html`, `pricing-temp.html`, `reviews-temp.html`, `styles-temp.css`, `about-temp.html`, `gallery-temp.html`, `admin-temp.html`, `cookies-policy-temp.html`
6. **ImageKit yardenvideos account**: registered under `rifzagury@gmail.com` — document this

## Key Credentials
- ImageKit images: `ik.imagekit.io/Yardendamri` (ofirdamr@gmail.com)
- ImageKit videos: `ik.imagekit.io/yardenvideos` (rifzagury@gmail.com)
- R2 bucket: `yarden-videos`, public URL: `pub-b53972ac15914c24b444efc1a580296e.r2.dev`
- Cloudflare account ID: `1c223389f8a4ebb05eb62cb6a8350924`
