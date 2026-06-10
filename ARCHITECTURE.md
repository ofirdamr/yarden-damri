# Site Architecture — yardendamri.co.il
*Last updated: June 2026*

---

## Hosting & Deployment

| Service | Role | URL |
|---------|------|-----|
| **GitHub Pages** | Static site host (both live + preview) | yardendamri.co.il |
| **Cloudflare** | DNS, CDN Cache Rules, R2 storage, Worker API | — |
| **Netlify** | Unused (dead `netlify/functions/ig-stats.js` remains in repo) |
| **Render.com** | DEAD — removed proxy, no longer used |

---

## Repository Structure

**Repo:** `github.com/ofirdamr/yarden-damri` (branch: `main`)

```
/ (root)            ← LIVE SITE (yardendamri.co.il)
  index.html        ← Homepage
  gallery.html      ← Gallery (loads gallery-data.js)
  gallery-data.js   ← Auto-generated media list (images=IK, videos=R2)
  gallery-settings.json ← Admin category assignments (read by Cloudflare Worker)
  about.html, services.html, pricing.html, reviews.html,
  bride.html, bridal-guide.html, contact.html, admin.html,
  accessibility-statement.html, disclaimer.html
  styles.css        ← Global styles
  CNAME             ← yardendamri.co.il
  robots.txt, sitemap.xml, sitemap-media.xml

/preview/           ← STAGING SITE (yardendamri.co.il/preview/)
  (mirrors root structure, all pages more updated)
  gallery-data.js   ← Same as root (both should be identical)
  PROGRESS.md, SUMMARY.md, ai_errors.md

/.github/workflows/
  sync-auto.yml     ← Instagram sync → writes preview/gallery-data.js every 6h
  cleanup.yml       ← Cleanup job
```

---

## Media Architecture

### Images
| Layer | Service | URL Pattern | Purpose |
|-------|---------|-------------|---------|
| Storage + Delivery | **ImageKit** (account: Yardendamri) | `ik.imagekit.io/Yardendamri/[path]?tr=...` | All photos |
| Transforms | ImageKit URL transforms | `?tr=w-800,q-auto,f-auto` | Resize, compress, WebP |

### Videos
| Layer | Service | URL Pattern | Purpose |
|-------|---------|-------------|---------|
| Storage | **Cloudflare R2** (bucket: `yarden-videos`) | — | Raw video files |
| Delivery | Custom domain via Cloudflare | `videos.yardendamri.co.il/[filename].mp4` | Video serving |
| Cache | Cloudflare Cache Rules | 1-week TTL at edge | Performance |
| Poster images | R2 (same bucket) | `videos.yardendamri.co.il/[filename].jpg` | Video thumbnails |
| ~~Optimization~~ | ~~ImageKit (yardenvideos account)~~ | **NOT USED** — R2 direct only | VPU limit hit |

### ❌ Cloudinary — DEACTIVATED
Account `dfjwxc1cw` is closed (limit exceeded). All URLs must use IK/R2.

---

## Backend Services

### Cloudflare Worker
- **URL:** `https://api.yardendamri.co.il/settings`
- **Auth:** `X-Admin-Password: makeup2026`
- **Role:** Read/write `gallery-settings.json` in repo root (admin category settings)
- **Data key:** `data.admin.cats`

### Instagram Sync (GitHub Actions)
- **File:** `.github/workflows/sync-auto.yml`
- **Schedule:** Every 6 hours
- **Output:** Writes `preview/gallery-data.js` with latest posts
- **Secrets:** `INSTAGRAM_TOKEN`, `IMAGEKIT_PRIVATE_KEY`, `IK_PRIVATE_VIDEOS`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`

---

## CDN URL Patterns

```
Images:   https://ik.imagekit.io/Yardendamri/[public_id]?tr=w-800,q-auto,f-auto
Videos:   https://videos.yardendamri.co.il/[filename].mp4
Posters:  https://videos.yardendamri.co.il/[filename].jpg
```

## JS CDN Helper Functions (in all HTML files)
```js
cdnUrl(url, w)      // imagekit image transform
cdnVideo(url, w)    // pass-through (R2 direct)
cdnVideoPoster(url) // replaces .mp4 → .jpg
```

---

## Go-Live Checklist
See `GO-LIVE.md` in repo root (9-step process to promote /preview → root).

## Known Dead Code
- `netlify/functions/ig-stats.js` — not used, Netlify not deployed
- `src/webhook-server.js` — local dev only
- `fix.js`, `cleanup-duplicates.js`, `fix-kv-videos.html`, `r2fix.html` — one-time fix scripts
