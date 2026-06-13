# Site Status — yardendamri.co.il

*Last updated: 2026-06-13*

## Current State
- **Root (/)**: Old site — still live, still references Cloudinary (closing). Do not touch.
- **Preview (/preview/)**: New site — all active development. Ready for go-live after checklist below.

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
| Cloudflare Worker (`yarden-admin`) | ✅ Deployed — session tokens + rate limiting |
| KV namespace (`yarden-admin-sessions`) | ✅ Created — ID: `7fc38ac017a145fea0a486419a3bff07` |
| deploy-worker.yml | ✅ CI/CD via GitHub Actions + `CF_WORKERS_API_TOKEN` secret |
| Instagram sync (sync-auto.yml) | ✅ Every 6h |

## Known Issues
- Hero video has brief dark flash — thumbnails not yet backfilled for 161 existing videos
- Old `yarden-videos` R2 bucket still has original uncompressed videos (backup, not in use)
