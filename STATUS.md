# Site Status — yardendamri.co.il

*Last updated: 2026-06-22*

## Current State
- **Root (/)**: Old site — still live, still references Cloudinary (closing). Do not touch.
- **Preview (/preview/)**: New site — all active development. Served at `yardendamri.co.il/preview/`.
- **Editing rule**: only edit `*-temp.html`; promote to permanent ONLY on explicit user approval (see CLAUDE.md).

## Current Focus (2026-06-21) — Gallery / media / sharing (DONE, promoted live)
- Videos display everywhere (grid thumbnail → autoplay on scroll w/ poster; lightbox plays w/ poster + muted fallback).
- Natural Instagram time order; photos + videos interleaved. Admin gallery matches the same order.
- Carousels (multi-image posts): one cover tile + ⧉ badge; lightbox swipes the post's children. Video tiles get a ▶ badge.
- Lightbox: Instagram-style action bar (like / comment / share / save-to-favourites), horizontal swipe to navigate, swipe up/down to dismiss, static media (no vertical drift), X cleared of cookie bar + video controls.
- Favourites: persistent per device (`localStorage gallery_favorites`) + a "♥ המועדפים שלי" gallery filter.
- Share: shares a short Worker link `api.yardendamri.co.il/s/<v|p>/<id>` → WhatsApp renders a clean card (thumbnail + "לחצי כאן לצפייה" + domain) that deep-links to the exact item via `gallery.html?m=<id>`.
- `fix.js`: retry wrapper so a single flaky page no longer truncates the Instagram fetch (was dropping many posts); carousel children tagged `carousel/cidx/ccount`.
- R2 CORS set on `yarden-images` / `yarden-videos-new` (free, via dashboard) for cross-origin reads.

## Go-Live Checklist
- [x] Security audit & hardening (session tokens, rate limiting, secure headers)
- [x] Clean up all `-temp` files from `/preview`
- [ ] Backfill `_thumb.jpg` for 161 existing R2 videos (hero dark flash on load)
- [ ] SEO: meta tags, sitemap.xml, structured data (JSON-LD)
- [ ] Verify all nav links work (no 404s)
- [ ] Test on mobile (iPhone, Safari, incognito)
- [ ] Promote `/preview` → root (copy files, update canonical URLs, re-deploy)

## All Pages — Status
| Page | Status |
|------|--------|
| index.html | ✅ Live in preview |
| about.html | ✅ Live in preview |
| services.html | ✅ Live in preview |
| bride.html | ✅ Live in preview |
| bridal-guide.html | ✅ Live in preview |
| gallery.html | ✅ Live in preview |
| pricing.html | ✅ Live in preview |
| reviews.html | ✅ Live in preview |
| contact.html | ✅ Live in preview |
| disclaimer.html | ✅ Live in preview |
| accessibility-statement.html | ✅ Live in preview |
| cookies-policy.html | ✅ Live in preview |
| admin.html | ✅ Working — session token auth |

## Admin & Backend
| Component | Status |
|-----------|--------|
| Cloudflare Worker (`yarden-admin`) | ✅ Deployed — auth + `/social` + `/s/<id>` share pages |
| Worker share route `/s/v|p/<id>` | ✅ OG card (thumbnail + "לחצי כאן לצפייה") → redirects to `gallery.html?m=<id>` |
| KV namespace (`yarden-admin-sessions`) | ✅ ID: `7fc38ac017a145fea0a486419a3bff07` |
| deploy-worker.yml | ✅ CI/CD via `CF_WORKERS_API_TOKEN`; uses `inherit` bindings to preserve ADMIN_PASSWORD + GH_TOKEN |
| R2 CORS (set-cors.yml + dashboard) | ✅ Allow GET/HEAD from yardendamri.co.il on both buckets |
| Instagram sync (sync-auto.yml) | ✅ Every 6h; resilient pagination (retry) |

## Known Issues
- ✅ **Lightbox button layout — RESOLVED & PROMOTED (2026-06-22)**: media opens edge-to-edge fullscreen (cover, Reels-style); like/comment/share/save moved to a right-side vertical rail (photos + videos), freeing the bottom for the native player controls — no overlaps. Gradient scrim removed (icon drop-shadow instead). Promoted to `preview/index.html` + `preview/gallery.html`.
- Hero video has brief dark flash — thumbnails not yet backfilled for 161 existing videos
- Old `yarden-videos` R2 bucket still has original uncompressed videos (backup, not in use)
- ImageKit fully dead (403) — any remaining `ik.imagekit.io` URLs must be swapped to R2 (about image already fixed → `images.yardendamri.co.il/about-yarden.png`)
