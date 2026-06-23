# Site Status — yardendamri.co.il

*Last updated: 2026-06-23*

## ▶ Current focus (2026-06-23) — ✅ GONE LIVE (Stage B done). Stage C still pending (needs user)
**GO LIVE complete:** `preview/` was promoted to the live **root** site on `main` (2026-06-23). The new
site now serves at `yardendamri.co.il/`. Promotion = copy preview files → root + rewrite every
`/preview/` → `/` (zero leftovers, grep-confirmed); verified on Chromium desktop 1440×900 + iPhone 13
emulation across 9 pages (no overflow, no JS errors, no `/preview/` links). `/preview/` is kept as a
harmless duplicate (robots.txt Disallows it so it stays out of the index). **Next = Stage C (repo split +
domain move) — separate, needs the user.** Note: `preview/*.html` remain the working source for future
edits; promote to root again at the next approved cutover.

## Current State
- **Root (/)**: ✅ NEW site — promoted live 2026-06-23. Served at `yardendamri.co.il/`.
- **Preview (/preview/)**: Working source for future edits; kept live as a duplicate (out of the index).
- **Editing rule**: `preview/*.html` stay the working source. Re-promote preview → root only at an explicit, user-approved cutover. See CLAUDE.md + SUMMARY.md.

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
- [x] **Promote `/preview` → root** (GO LIVE, 2026-06-23: copied files, rewrote `/preview/`→`/`, verified ROOT pages on Chromium desktop+mobile, pushed)
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
