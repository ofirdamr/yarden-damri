# Progress Log — Preview Folder

## June 2026 — Homepage & Site Redesign
- index.html: Philosophy, Area, CTA, Reviews, Contact, Share strip, About — all redesigned
- about.html: full rewrite (Hero + Story + Experience + CTA), warm premium voice
- styles.css: alternating cream/warm rhythm across all sections
- pricing.html: title fixed

## June 2026 — Media Migration
- Cloudinary → R2: all images (yarden-images) + videos (yarden-videos-new)
- Images: WebP 800px, Videos: H.264 720p via ffmpeg in sync script
- Removed all Cloudinary references from codebase

## June 2026 — Likes / Comments / Gallery
- Fixed Instagram likes/comments: removed sessionStorage (broken on iPhone incognito)
- getIgStats now checks post_id first (instagram-stats.json keyed by post_id)
- Root + preview gallery-data.js and instagram-stats.json auto-synced on every workflow run
- Gallery: lazy loading, viewport autoplay, PAGE_SIZE=24, hidden items working
- Admin video picker: derives _thumb.jpg, fallback to video element
- Sync workflow fixed: no hang, parallel stats fetch, skips existing items

## June 2026 — Admin & Hero Video
- Admin waits for Worker fetch before rendering
- Hidden filter is hard override (skips catFilter/searchTerm)
- Hero video: set from gallery-data.js HERO_VIDEO var, Worker updates in background
- Web-wide likes/comments via Worker /social endpoint — no localStorage

## 2026-06-13 — Cookies Policy + Banner
- Created `cookies-policy.html` — full Hebrew cookies policy, matches site style
- Created `cookie-banner.js` — shared script, added to all 12 public pages
- Banner: slim frosted-dark (charcoal #111111 + gold #B89060), one-time per visitor via localStorage
- Policy covers: Essential / Analytics (GA4) / Marketing (Meta Pixel) / Instagram API / Google Reviews

## 2026-06-13 — Admin Security Refactor (complete)
- **Worker** (`worker.js`): replaced raw `X-Admin-Password` header with KV-based session tokens
  - `POST /login` — validates password, issues 64-char hex token (8h TTL in KV `SESSIONS`)
  - `POST /logout` — invalidates token
  - `POST /settings` — requires `Authorization: Bearer <token>`
  - Rate limiting: 5 failed logins → 15-min IP lockout (KV key `rl:{ip}`)
  - CORS hardened: explicit allowlist (`yardendamri.co.il`, `www.`, localhost dev ports)
  - Security headers: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `CSP: default-src 'none'`, etc.
- **cloud-storage.js**: replaced password sessionStorage with session token (`yd_session_token`)
  - `login(password)` POSTs to Worker, stores returned token
  - `logout()` POSTs to `/logout` (best-effort), clears token
  - All writes send `Authorization: Bearer <token>`; on 401/403 clears token automatically
  - Backward-compat shims: `getPwd/setPwd/clearPwd/hasPwd` map to token equivalents
- **admin.html**: `tryLogin()` rewritten to call `RemoteState.login()` (no local SHA-256 check)
  - Handles 429 (rate limit), 401 (wrong password), network errors — all in Hebrew
- **KV namespace**: `yarden-admin-sessions` (ID: `7fc38ac017a145fea0a486419a3bff07`) created on Cloudflare
- **deploy-worker.yml**: GitHub Actions workflow deploys Worker to `yarden-admin` script via CF REST API
- All `-temp` files promoted to permanent and deleted

## Pending
- Backfill _thumb.jpg for 161 existing R2 videos (hero has brief dark flash)
- SEO completion (meta, sitemap, structured data)
- Go-live: promote /preview → root (follow GO-LIVE.md checklist)
- Online reservation system (post-launch)
- Google Places API for live reviews (post-launch)
