# Site Status — yardendamri.co.il

*Last updated: 2026-06-23*

## ▶ Current focus (2026-06-23) — READY TO GO LIVE (read SUMMARY.md "NEXT SESSION" first)
All `preview/` work is **done & verified** on `main` (live at `/preview/`): 3 desktop fixes (lightbox,
services 2×2, hero), hero Instagram-max pipeline, three-tier media (grid thumb / 1080 lightbox / max
hero) with all 611 photos reprocessed, Instagram sync fixed + race-safe, and nav/footers made fully
consistent (byte-identical footers across all 12 pages). **Next task = GO LIVE: promote `preview/` →
root** (Stage B) — see the embedded GO-LIVE PLAN in SUMMARY.md. Gate the cutover behind one visual check
of the ROOT pages, then push. Stage C (repo split + domain move) is later and needs the user.
Note: `preview/*.html` are the working source (the `-temp.html` files were deleted).

## Current State
- **Root (/)**: Old site — still live, still references Cloudinary (closing). Do not touch.
- **Preview (/preview/)**: New site — all active development. Served at `yardendamri.co.il/preview/`.
- **Editing rule**: `preview/*.html` are the working source (the `-temp.html` files were deleted). The live **root** changes only at the explicit, user-approved **go-live** (promote `preview/` → root). See CLAUDE.md + SUMMARY.md.

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
- [x] Video posters / thumbnails present on R2 (grid + lightbox)
- [x] SEO: meta tags, canonical/og, sitemap.xml, structured data (JSON-LD)
- [x] Instagram sync fixed + race-safe (was failing nightly on deleted temp files)
- [x] Three-tier media (grid ~600px thumb / lightbox ~1080 / hero IG-max); 611 photos reprocessed
- [x] Nav + footers consistent across all 12 pages (footers byte-identical)
- [x] Mobile render verified (menu + footer at 390px, no JS errors)
- [ ] **Promote `/preview` → root** (the go-live: copy files, rewrite `/preview/`→`/`, verify ROOT pages, push) — see SUMMARY.md GO-LIVE PLAN
- [ ] Stage C (later, needs user): repo split (private full history + public serving) + domain move

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
