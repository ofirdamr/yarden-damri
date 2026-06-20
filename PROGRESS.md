# Yarden Damri Website — Progress Log

## ✅ Completed

## 2026-06-20 — ROOT CAUSE found: gallery videos "not there" (preview/gallery.html)
Verified by observation, not guessing (user: hero video PLAYS = video domain fine; gallery video tiles "not there at all"). Data checked: gallery-data.js has 162 videos all with thumb URLs; 138 survive admin hidden/private-category filtering — so the data and filter were NEVER the problem. Two real causes in gallery.html:
1. No way to reach the videos — only category filters existed (no photos/videos toggle), and the admin `order` + bride-keyword sort buried videos deep in the masonry, so first pages show only photos.
2. Invisible video tiles — `<video>` had `width:100%` with NO height/aspect-ratio in the `columns` masonry, plus `onerror→display:none`, so tiles collapsed to zero size.
Fix (surgical, in source — no rebuild): added a הכל/תמונות/סרטונים media filter (independent of category filter); gave video tiles `aspect-ratio:4/5;object-fit:cover` + bg so they always have a visible box; removed the `onerror` hide. index.html homepage gallery has the same class of bug (img+data-video swap + `.slice(0,PER_PAGE)` cap) — pending after gallery.html is confirmed.

## 2026-06-20 — Rebuilt gallery from scratch: preview/gallery-new.html
Decision: stop debugging the tangled gallery pipeline in index-temp.html (stale 772-entry hidden list, 899-entry order map, brideKW sort, pagination that buried all videos on page 2). Built a fresh, self-contained gallery page.
- Reads gallery-data.js directly. No admin-settings filtering, no stale hidden/order.
- All 773 items in natural data order, so 12 videos appear in the first 40 tiles (immediately visible).
- Videos: video tag with src autoplay muted loop playsinline preload=metadata poster, plus IntersectionObserver play/pause. No play button.
- Filters: הכל / תמונות / סרטונים. "הצגת עוד" load-more (40/batch). Lightbox with prev/next + keyboard.
- Self-contained: inline CSS/JS, no styles-temp.css dependency.
- NOT yet verified live (session egress blocked). Pending user review at /preview/gallery-new.html.

## 2026-06-20 — ✅ CONFIRMED WORKING: gallery videos autoplay everywhere (incl. iPhone)
- User confirmed videos now autoplay from all devices including iPhone.
- Final working combo: `<video src autoplay muted loop playsinline preload="metadata" poster>` + `observeGalleryVideos()` IntersectionObserver that sets `v.muted=true` and calls `v.play()` on visible tiles / `v.pause()` off-screen. No play button anywhere.

## 2026-06-20 — iOS gallery autoplay: preload=metadata + force muted at play()
- User confirmed (after deploy) the video spots show static poster thumbnails but don't play on iPhone — i.e. new `<video>` code IS live, but iOS won't auto-start.
- Root cause: `preload="none"` means iOS Safari never fetches video data, so it shows only the poster frame.
- Fix: `preload="none"` → `preload="metadata"` on gallery `<video>` tiles, and set `v.muted = true` right before `v.play()` in observeGalleryVideos (iOS checks the muted property at play() time).
- Note: iOS Low Power Mode disables all autoplay regardless of code.

## 2026-06-20 — Restored missing observeGalleryVideos() — videos now actually play
- Root cause of "only images, no videos": `observeGalleryVideos()` was CALLED (renderPage, DOMContentLoaded, setTimeout) but NEVER defined — a past session deleted it when switching to the play-button approach. Without it, grid `<video>` tiles never received `.play()`, so on iOS Safari they showed only their poster thumbnail (looked like images).
- Fix: defined `observeGalleryVideos()` — an IntersectionObserver that plays visible gallery videos and pauses off-screen ones (play/pause only, no play button). Also serves performance for 162 videos.
- Confirmed via user screenshot that served gallery-data.js DOES contain the videos — data was never the problem.

## 2026-06-20 — Gallery videos autoplay (deployed to main)
- `preview/index-temp.html` renderPage(): video tiles now render a real `<video src="${item.u}" autoplay muted loop playsinline preload="none" poster="${item.thumb}">` instead of `<img>` + play-button overlay
- Videos autoplay (muted, looping) in the gallery grid — no play button anywhere
- Images unchanged (`<img>` via cdnUrl); hover handlers already guard `img` with `if (imgEl)`
- Deployed straight to `main` (GitHub Pages serves /preview/ only from main)

## 2026-06-20 — Video gallery restore + cache-busting
- R2 API credentials deleted and recreated; GitHub Secrets `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` updated
- Sync triggered: 162 videos with audio + thumbnails uploaded to R2 (both buckets)
- `preview/gallery-data.js` now has 773 items: 611 images + 162 videos (all with `video:true` + `thumb`)
- **Root cause of "no videos"**: `gallery-data.js` had no cache-busting — browser served old file with 0 videos
- Fix: added `?v=1750416000` to script tag (bumped from 20260620 to force new pages deploy); fix.js bumps version on every sync
- Gallery video tiles: replaced `<video data-src>` (fragile, broken on iOS) with `<img src="${thumb}">` + play icon overlay
- Pagination bug fixed: `filteredImages` was sliced to 48 items, making pages 2+ empty — removed the slice
- Previous `?v=20260620` never deployed (pages build race condition) — bumped to `?v=1750416000` and re-committed

## 2026-06-13 — Admin Security Refactor
- Worker (`preview/worker.js`): replaced raw `X-Admin-Password` header with KV session tokens
  - `POST /login` → validates password, issues 64-char hex token (8h TTL, stored in KV `SESSIONS`)
  - `POST /logout` → invalidates token
  - `POST /settings` → requires `Authorization: Bearer <token>`
  - Rate limiting: 5 failed logins → 15-min IP lockout (`rl:{ip}` KV key)
  - CORS: explicit allowlist, `Vary: Origin`, security headers (HSTS, X-Frame-Options: DENY, CSP)
- `preview/cloud-storage.js`: full login/logout flow, Bearer token on all writes, 401/403 auto-clears token
- `preview/admin.html`: `tryLogin()` calls `RemoteState.login()` — handles 429/401/network in Hebrew
- `deploy-worker.yml`: GitHub Actions CI/CD — creates KV namespace, deploys Worker via Cloudflare REST API
- KV namespace `yarden-admin-sessions` created (ID: `7fc38ac017a145fea0a486419a3bff07`)
- All `-temp` files promoted to permanent and deleted

## 2026-06-13 — Nav consistency fix: added ביקורות to homepage
- `index.html` desktop nav and mobile menu were missing ביקורות — all other pages had it
- Added `<li><a href="/reviews.html">ביקורות</a></li>` to both desktop and mobile nav in `index.html`
- Root cause of intermittent "two ביקורות" bug: iOS Safari bfcache serving subpage DOM on homepage, resulting in visible duplicates
- Fix: nav is now identical across all pages

## 2026-06-13 — Cookie Banner Redesign + GA Consent Gating
- Rewrote `preview/cookie-banner.js`: slim 48px bar at top of page (z-index:10001), slides down from top
- Nav (`nav[role="navigation"]`) shifts to `top:48px` via `body.has-ck` class while banner is visible; returns to `top:0` on dismiss
- Banner layout: cookie text + מדיניות פרטיות link | "אני מסכימה" button | ✕ close button
- ✕ = declined (banner closes, GA never loads); "אני מסכימה" = accepted (GA loads dynamically)
- Floating buttons (WA, accessibility) completely untouched — no position changes
- GA (`G-68XM6LS4HX`) removed from `<head>` of all 10 preview pages; now loads only after explicit accept
- Returning visitors who already accepted: GA loads immediately on page load (no banner shown)
- Banner appears on first visit to ANY page of the site; localStorage prevents re-showing after accept/decline
- Applied to: index.html + all 9 subpages (about, accessibility-statement, bridal-guide, bride, contact, gallery, pricing, reviews, services)

## 2026-06-13 — Cookies Policy + Cookie Banner (original)
- Created `preview/cookies-policy.html` — full Hebrew cookies policy page (matches disclaimer.html style)
- Created `preview/cookie-banner.js` — shared script added to all 12 public pages
- Banner: slim frosted-dark bar (preview charcoal #111111 + gold accent #B89060), appears once on first visit to any page, never shown again after accept/decline (localStorage)
- Policy covers: Essential / Analytics (GA4) / Marketing (Meta Pixel) / Instagram API / Google Reviews

## 2026-06-03 — preview/ share buttons
- Added share strip to gallery.html (after gallery grid), reviews.html (after reviews), index.html (between reviews and contact sections)
- Strip shows "שתפי עם חברה" button — triggers native Web Share API on mobile; falls back to WhatsApp web on desktop
- CSS added to styles.css: `.share-strip`, `.share-strip-text`, `.share-strip-btn`

## 2026-06-03 — preview/ nav + footer social buttons
- Fixed nav logo `href="/"` → `href="/preview/"` on 5 subpages (about, accessibility-statement, bridal-guide, contact, disclaimer)
- Added Instagram + TikTok footer buttons to all 10 preview subpages (were missing)
- Styled as 34×34px square buttons matching hamburger menu style
- Tuned icon sizes (IG 17px, TikTok 24px) to balance visual weight — TikTok still appears slightly smaller (deferred)

- fix: BCyber (Bezeq) block — replaced `workers.dev` Worker URL with custom domain `api.yardendamri.co.il` in `preview/cloud-storage.js` to remove the suspicious domain reference that triggered the filter; submitted false-positive removal request to Bezeq at ca-2@bezeq.co.il

- fix: mobile menu social buttons (Instagram/TikTok) now equal height + width — `.mobile-social .social-pill` set to `flex:1 1 0; min-width:0; height:44px; padding:0 11px` and removed `flex-wrap:wrap` from `.mobile-social` (prevented uneven sizing/wrapping); previous `flex:1` alone was undercut by base `height:36px` and the wrap allowing the longer "Instagram" label to size differently
- fix: mobile menu social buttons (Instagram/TikTok) equal width via `flex:1` on `.mobile-social .social-pill`

### Infrastructure
- Migrated hosting from Netlify (suspended) → GitHub Pages
- Set up Cloudflare DNS with proper A records
- Fixed SSL/HTTPS configuration
- Set up GitHub Actions for automated Instagram sync every 6 hours
- All 1531 images uploaded to Cloudinary (permanent URLs)

### Instagram Integration
- Fetches all posts + likes + comments_count from Instagram API
- Saves to `instagram-stats.json` via GitHub Actions
- Comments text blocked by Meta (requires app review permission)
- Fixed carousel album duplicate bug (was 1531 → deduplicated to 1131 unique)
- Fixed Unicode characters in captions that were breaking gallery JS

### Gallery
- 1131 unique images on Cloudinary with permanent URLs
- WebP/AVIF auto-conversion via Cloudinary (`f_auto,q_auto`)
- Lazy loading — images load only when scrolled into view
- Video lazy loading — videos load only when in viewport, play/pause on scroll
- Video compressed to 480p via Cloudinary for fast loading
- Lightbox with keyboard navigation

### Admin Panel (`/admin.html`)
- Password login with SHA-256 hashing (no plain text passwords in code)
- Show/hide password button
- Gallery grid with 60 images per page (pagination)
- Multi-select with bulk actions:
  - 🚫 Hide / 👁️ Show
  - 📌 Pin / Unpin group
  - 🏷️ Set category for group
  - 🔄 Rotate group
  - ⬆️ Move group to top
  - 🗑️ Delete selected
- Duplicate finder (🔁 כפולות filter)
- Category management
- 💰 Pricing editor — edit service name, price, description, included items
- 📊 Analytics tab with GA4 OAuth connect button

### Analytics
- Google Analytics GA4 tracking code installed (G-68XM6LS4HX)
- GA4 OAuth set up (Client ID + Client Secret configured)
- Property ID: 536415544
- Connect button in admin → Analytics tab — shows real data after login:
  - Sessions, users, bounce rate, avg session duration
  - Traffic sources (Google, Direct, Social, etc.)
  - Device breakdown (mobile/desktop)
  - Cities
  - Age/gender (requires GA4 demographics enabled)
  - Top pages

### SEO
- Sitemap with 10 pages + 500 images with captions (`sitemap.xml`)
- `robots.txt` allowing Google image crawling
- Keywords meta tags on all pages
- `<canonical>` URLs on all pages
- JSON-LD structured data on all pages
- Internal footer links for Google discovery
- New indexed pages:
  - `/bride.html` — מאפרת כלות אילת
  - `/services.html` — שירותי איפור
  - `/bridal-guide.html` — מדריך כלות (high-traffic article)
  - `/pricing.html` — מחירון
  - `/disclaimer.html` — תנאי שימוש ומדיניות

### Accessibility (IS 5568)
- Skip navigation link
- ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader announcements
- Accessibility statement page (`/accessibility-statement.html`)
- Accessibility widget with contrast, text size, links highlight

### Performance
- Cloudinary CDN for all images and videos
- `preconnect` hints for Cloudinary
- `decoding="async"` on all images
- `loading="lazy"` on all gallery images
- IntersectionObserver for video autoplay only when visible
- `gallery-data.js` cache-busting query parameter

### Bug Fixes
- Fixed nav background (was cream-on-cream invisible)
- Removed duplicate WhatsApp button (left side was duplicate)
- Fixed Instagram/TikTok icon alignment in nav
- Fixed gallery-data.js Unicode characters breaking JS parse
- Fixed admin gallery not showing (catMap scope bug)
- Fixed admin login JS syntax error (newline in prompt string)
- Fixed Cloudinary upload duplicates (carousel album children bug)
- Removed old patch files (video-fix.js, sync-all-instagram.js, webhook-server.js)
- Fixed GitHub Actions workflow merge conflicts

---

## 🔴 Still Pending

### Pages (incomplete/404)
- `/gallery.html` — standalone gallery page
- `/reviews.html` — reviews page
- `/contact.html` — contact page
- All sub-pages need luxury dark redesign to match site

### Design
- Luxury fashion magazine redesign (in progress)
- Sub-pages currently show with wrong white text on light background
- `subpage.css` created — needs to be applied to all sub-pages

### Booking System
- Calendly integration for online booking with iPhone calendar sync
- Online payment (Bit, credit card)
- 10% discount for online reservations (logic built into pricing page)

### Features Pending
- Bride packages section in admin
- Booking/calendar sync with Yarden's iPhone (requires Calendly setup)

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main site (one-page) |
| `styles.css` | Main site styles |
| `subpage.css` | Sub-page shared luxury CSS |
| `admin.html` | Admin panel |
| `fix.js` | Instagram sync (GitHub Actions) |
| `gallery-data.js` | Auto-generated gallery data |
| `instagram-stats.json` | Auto-generated IG likes/comments |
| `.github/workflows/sync-auto.yml` | GitHub Actions workflow |
| `bride.html` | Bride page |
| `services.html` | Services page |
| `pricing.html` | Pricing page |
| `bridal-guide.html` | Bridal guide article |
| `disclaimer.html` | Legal/terms |

## 🔑 Credentials & IDs
- **GitHub repo**: ofirdamr/yarden-damri
- **GA4 Property ID**: 536415544
- **GA4 Measurement ID**: G-68XM6LS4HX
- **Cloudinary cloud**: dfjwxc1cw
- **Instagram token**: stored in GitHub Secrets (INSTAGRAM_TOKEN)

## 2026-05-25
- Fixed mobile menu links in index.html, services.html, gallery.html, bride.html
- Bug: mobile menu had old anchor links (#services, #gallery etc.) instead of page links (/services.html etc.)
- All pages now have consistent mobile menu: אודות | מאפרת כלות | שירותים | גלריה | מחירון | צרי קשר
- Note: pricing.html is empty (redirect to /), needs to be built

## 2026-05-25 (cont.)
- Fixed services.html color scheme — section was missing id=services so dark charcoal background wasn't applied, leaving white text on cream background

## 2026-05-25 (pages)
- Created about.html — extracts about section from index.html
- Created contact.html — extracts contact section + form from index.html
- Added bridal-guide.html to nav on all pages
- Updated all nav links: /#about → /about.html, /#contact → /contact.html (subpages only)
- index.html keeps #about and #contact anchors for homepage scrolling
- Fixed bridal-guide.html nav (removed pricing, fixed mobile menu, replaced footer)
- Nav is now consistent across all 7 pages: אודות | מאפרת כלות | שירותים | גלריה | מדריך כלות | צרי קשר

## 2026-05-25 (disclaimer)
- Fixed disclaimer.html: text colors (white→dark), nav (added bridal-guide, removed pricing), footer (canonical markup)

## 2026-05-25 (SEO fixes)
- Fixed sitemap: removed duplicate gallery.html plain entry, kept image-rich entry
- Added about.html to sitemap
- Created reviews.html — full page with review form + Google Maps + JSONBin integration
- Added SEO keyword paragraph to gallery.html
- Canonicals confirmed already present on all 4 pages (SEO specialist was looking at old version)
- Pricing.html: still redirect placeholder — waiting for admin content

## 2026-05-26
- Fixed bride.html footer: was using custom dark footer with rgba(62,42,26,.45) dark brown text on #1a1008 dark background — completely invisible. Replaced with canonical <footer role="contentinfo"> markup.
- Fixed gallery.html footer: was using custom dark footer instead of canonical markup. Replaced with <footer role="contentinfo">.
- Both footers now use white text (rgba(255,255,255,.45)) on dark background, consistent with all other pages.
- Fixed gallery.html: 289 video entries were invisible (loadPage rendered .mp4 URLs as <img> → failed to load). Now uses Cloudinary video-to-JPEG thumbnail for grid (so_0 frame). Lightbox updated to show <video> element for video entries with autoplay controls, pauses on close/navigate.
- gallery.html: full port of homepage gallery — now has likes/comments, Instagram stats sync, video autoplay via IntersectionObserver, admin settings (hidden/pinned/order respected via gallery_admin localStorage key), cdnUrl/cdnVideo/cdnVideoPoster for f_auto+q_auto on all media.
- index.html: homepage gallery now shows images only, capped at 48 items (no videos). Replaced pagination with "לכל הגלריה ←" link to gallery.html. Reduces Cloudinary bandwidth on homepage.
- TODO: sync gallery_admin settings to JSONBin so admin curation applies for all visitors (JSONBin was down at time of implementation).

## $(date +%Y-%m-%d) - Fixed mobile social pills size mismatch
- Locked `.mobile-social .social-pill` and `.footer-social-pills .social-pill` to exact 44x44 with min/max width/height
- Forced inner SVG to 18x18 via CSS (overrides inconsistent 15/16px HTML attributes)
- Centered both pairs (`justify-content: center`) for visual alignment consistency
- File: styles.css lines 346-352

## Rebuilt social buttons from scratch
- Deleted `mobile-social`, `footer-social-pills`, `social-pill ig/tt` (in mobile/footer contexts)
- Created new `.social-circles` (wrapper) + `.social-circle.ig/.tt` (button) — 48x48 circles, 22px SVG, centered
- One identical block in mobile menu + footer across all 10 HTML pages
- Cleaner code, no cascade conflicts possible

## Authentic brand styling for social buttons
- Instagram: switched to official radial-gradient (yellow→orange→pink→purple→blue, like real IG app icon)
- TikTok: replaced SVG with authentic 3-layer glitch logo (cyan #25F4EE + red #FE2C55 + white)
- Sized 42x42 (was 48x48) — better fit for mobile UI
- Updated across all 10 pages with one script

## Matched SVG viewBoxes for identical visual size
- Both IG and TT now use 24x24 viewBox with paths filling full area
- Both icons white (consistent visual weight)
- Hard-locked circle to 42px (min/max width+height, line-height 0, padding 0)
- IG keeps authentic radial gradient background; TT keeps black

## Eliminated irradiation illusion on social circles
- IG: muted linear gradient (#515BD4 → #8134AF → #DD2A7B → #FEDA77)
- Icons bumped 20→22px so white logo dominates
- Both circles now have equal visual weight at 42px

## Final design: site-matched social circles
- Both circles identical: 44px, `var(--deep)` background, `var(--blush)` icon + border
- Only icon SVG path differs (IG camera vs TT note)
- Matches site palette — elegant brown/blush instead of clashing bright brand colors
- `all: unset` + 12 `!important` size locks — bulletproof against any CSS conflict

## 2026-05-27 - Preview deploy via GitHub Pages
- Netlify is suspended → no branch previews available
- Solution: created /preview/ folder on main branch with ui-redesign content
- GitHub Pages already serves main → preview will be live at yardendamri.co.il/preview/
- Non-destructive: only adds folder, does not touch existing files
- After review, user can delete preview/ folder

## 2026-05-27 - Reviews page editorial overhaul (preview/)
Fixed all dark-theme leftovers + UX issues on reviews.html:
- Replaced all `var(--card)` (#111 black) and dark rgba colors with cream editorial palette
- New scoped CSS classes (`.rv-hero`, `.rv-rating`, `.rv-card`, `.rv-cta`, `.rv-skel`) — no inline styles
- Skeleton loaders (shimmer animation) instead of "טוענת ביקורות..." text
- Larger editorial rating display (4rem rating number, gold stars on cream)
- White cards on cream bg with subtle hover lift + shadow
- CTA box now light editorial (white + thin cream border) — was a black block
- XSS-safe rendering with escapeHtml() helper
- aria-busy + aria-live for screen readers during loading
- Better fallback: shows 5.0 rating + clean Google link, never an empty page
- Security comment block above API key with required Google Cloud restrictions

## 2026-05-27 - Gallery + Homepage video & comment fixes (preview/)
Fixed 5 issues:
1. Gallery: Removed play SVG overlay (videos autoplay)
2. Gallery: Comment button "opened big video" bug → action buttons were opacity:0 (hover-only) so mobile users couldn't tap. Now always visible on touch devices (media hover:none), with pointer-events isolated to buttons + event.preventDefault on click handlers.
3. Comment modal: Added direct IG link (uses igStats.permalink). Honest about IG comment limitation — actual comment text requires Instagram Graph API + business token + server-side fetcher (currently instagram-stats.json has empty comments arrays). For now, link redirects users to IG to read all comments.
4. Homepage gallery: Video autoplay was broken because video used data-src (lazy) and observer was sometimes failing to fire on first render. Changed to direct `src` + `autoplay preload="metadata"`. Same mobile-button fix as gallery.
5. Homepage hero: Added selectable hero video — admin panel has new "Hero Video" picker in Settings tab. Priority chain: hero-config.json (committed file, all visitors) > localStorage gallery_admin.heroVideo (this browser only) > default.

Files touched: preview/gallery.html, preview/index.html, preview/admin.html

## 2026-05-27 - MAJOR: Admin settings now public via JSONBin (preview/)
**Discovery:** The site already uses JSONBin (for customer reviews), Render.com (IG feed), Cloudinary, and a GitHub Action that auto-syncs Instagram every 6 hours. So infrastructure exists — just admin gallery settings were stuck in localStorage.

**Changes:**
1. Created `preview/remote-state.js` — shared module that loads/saves admin state via JSONBin. Includes:
   - 1-minute cache to reduce API calls
   - Optimistic local update (UI feels instant)
   - Auto-merge so other bin keys (reviews) are preserved on writes
   - In-flight dedup so concurrent fetches don't race
2. Admin.html: `getSettings/saveSettings` now read/write via RemoteState. On init, migrates existing localStorage data to remote (one-time, if remote is empty).
3. Index.html: applyAdminSettings reads from RemoteState. After remote loads, re-renders gallery with synced state.
4. Gallery.html: same pattern as index.
5. Hero video: now stored in `record.heroVideo` of the same bin. All visitors see admin's choice.
6. Reviews continue to work — same bin, same `reviews` key, just routed through RemoteState.

**fix.js update:** Added permalink to per-post stats fetch + warning log when comments are requested but unavailable (token permission issue).

**Result:** Hide/pin/order/category/heroVideo changes in admin are now visible to ALL visitors within ~1 minute (cache TTL).

## 2026-05-27 - IS 5568 accessibility widget on ALL pages
- Created preview/a11y.js — self-contained widget that auto-injects ♿ button + panel on any page that includes the script
- Added <script src="a11y.js" defer> to: about, bridal-guide, bride, contact, disclaimer, gallery, pricing, reviews, services, accessibility-statement
- Index.html already has inline widget (kept as-is for now; a11y.js detects existing #a11y-trigger and skips injection to avoid duplicates)
- Settings (contrast/text size/links/animations) sync across all pages via localStorage 'a11y_prefs_v1'
- Alt+A keyboard shortcut works everywhere
- FOUC prevention: prefs applied BEFORE first paint via inline IIFE in a11y.js
- IS 5568 / WCAG 2.1 AA compliance restored across the entire preview site

## 2026-05-27 - Hero video picker = visual grid (preview/)
- Replaced dropdown (select by caption) with visual thumbnail grid
- Each video shows poster thumbnail (Cloudinary so_0 frame)
- Hover (desktop) or tap (mobile) plays a low-res preview inline
- Click a video to select it → saves to RemoteState → public within 1 min
- Selected video gets highlighted border + "✓ נבחר" badge
- Preview videos use preload="none" until hovered (saves bandwidth)

## Admin video preview + head-video selection (Stage 1)
- ▶️ on video cards plays actual video in modal; ☆/⭐ marks head video (s.headVideo)
- TODO Stage 2: display head video on site

## 2026-05-27 - Reviews nav + on-site review form (preview/)
1. NAV FIX: ביקורות (reviews) link was missing from main nav on index, gallery, services, bride (present on about/contact/pricing). Added to both desktop + mobile nav on all 4.
2. ERROR 500 FIX: reviews.html only fetched Google reviews (read-only). The Google Places API was returning errors (500/403) that weren't fully handled. Added res.ok check + data.error check → graceful showFallback() instead of crash.
3. NEW on-site review form on reviews.html: visitors can now write name + star rating + text. Saves to JSONBin (record.reviews) via RemoteState → public to all. Shows submitted reviews in a "ביקורות מהאתר" grid. Same bin as homepage form, so reviews appear in both places. Optimistic update with rollback on failure.
4. Google "write review" button kept as secondary link.

## 2026-05-27 - Correct Google review direct links
- User shared maps link → extracted verified place id (hex 0x57a7c2a72e19d7fa = ChIJCT7WZcVzABUR-tcZLqfCp1c, the existing one was correct after all)
- The earlier 500 was likely transient/CDN, not a bad place id
- Write button → search.google.com/local/writereview?placeid= (opens write-review box directly)
- Read fallback → search.google.com/local/reviews?placeid= (opens reviews directly)

## 2026-05-27 - Reviews Google links → reliable CID profile URL
- Place ID couldn't be reliably derived (protobuf encoding non-trivial, test vector failed)
- writereview?placeid= with wrong/derived id gave 404/500
- Solution: both buttons → https://www.google.com/maps?cid=6316231025699182586 (CONFIRMED working)
- This opens the Google profile where "Write a review" button is at the top
- Live Google reviews API call disabled (PLACE_ID empty) → on-site form is primary
- On-site reviews (JSONBin) remain the reliable review system

## 2026-05-28 - PERMANENT FIX for data loss bug (categories + pricing)
**Root cause finally identified**: writes were happening before RemoteState.fetch() completed. User opens admin → clicks pricing tab/category in the 1-2 sec gap before fetch finishes → getSettings returns DEFAULT values → save writes DEFAULTS over real data in JSONBin.

**Fix:**
- remote-state.js: added `_ready` gate. update() refuses to write until first successful fetch.
- admin.html: removed dangerous migration code. initAdmin shows "connection failed" UI if fetch fails — never silently overwrites.
- saveSettings: shows "syncing" toast if user tries to save too early.

This is the permanent fix. Categories, pricing, hero video, rotations, hidden, pinned, order — none can be overwritten by stale defaults anymore.


## 2026-06-03 - Fix hero video flash on page load
- Refactored `applyHeroVideo` IIFE to apply from localStorage cache synchronously before network fetch — no flash on return visits

## Session: Hero video — real fix for all visitors
- Baked chosen video src+poster directly into preview/index.html (no more default video)
- Worker (preview/worker.js) now calls patchIndexHtml() when POST /settings contains heroVideo

## Session 2026-06-03 (continued)
- Deleted Render.com service — was crash-looping on missing webhook-server.js
- Cloudflare Worker already handles everything Render was supposed to do
2026-06-03 - Added favicon (favicon.ico, favicon.png, apple-touch-icon.png) from Yarden's photo across all HTML pages
2026-06-03 - Fixed og:image on MAIN site root (index.html) - the shared link is root, not /preview. Old Cloudinary image replaced with share-preview.jpg

## 2026-06-04 - PageSpeed performance fixes
- Added `<link rel="preload">` for hero LCP image and styles.css
- Added `fetchpriority="high"` + `decoding="sync"` + explicit `width`/`height` to hero img (reduces LCP + CLS)
- Changed `gallery-data.js` (668KB) from synchronous to `defer` (removes render-blocking)
- Wrapped gallery init in `DOMContentLoaded` to work correctly with deferred gallery-data.js

## 2026-06-04
- Deleted duplicate #wa-fab WhatsApp button block ENTIRELY from index.html (root) and preview/index.html
- Single working .wa-float remains (green, bottom-right)
- Removed the old `#wa-fab{display:none !important;}` patch and its dead HTML block
- Layout: WA bottom-right | scroll-top + accessibility bottom-left

## 2026-06-04 (patch hunt)
- New standing mission: find patches/band-aids and rewrite clean (no hiding, no all:unset, no !important storms, no dead code)
- index.html: removed dead JS monkey-patch (_origRenderPage, origRenderPage, setTimeout hack); renderPage() now calls observeGalleryVideos() directly
- styles.css: rewrote .social-circle from scratch - removed all:unset + ~25 redundant !important (no global `a` rule was conflicting, so they were never needed)

---
## June 2026 — SEO + Analytics + Content

### SEO
- Sitemap cleaned (removed 404/redirect/duplicate pages)
- sitemap-media.xml created (80 images, 30 videos, no emojis)
- sitemap-index.xml created
- noindex added to admin.html
- Static SEO content added to pricing.html and gallery.html
- All 7 pages submitted for indexing in Search Console

### Analytics Admin
- OAuth fixed: hardcoded redirect URI, published app to production
- GA4 Data API enabled
- Added: bounce rate insight, specific sources, region+city, GSC setup guide
- Google Signals enabled, Reporting Identity = מעורב

### Reviews page
- reviews.html created with Google Places API (live reviews from Google Business)
- Added to all navs + sitemap

### Content (Gemini)
- services.html (preview): new copy, 4 main cards + FAQ
- bridal-guide.html (preview): 4 steps, warm tone, no AI language

### Mistakes
- Forgot to update step 01 in bridal-guide — kept old "הידרציה" content. Always check ALL steps when doing content updates, not just the ones explicitly mapped.
- Used dark theme CSS variables in FAQ section on light-theme preview site. Always check --card/--text values in preview/styles.css before writing inline styles.

## 2026-06-04 (UX/UI fixes session)

### Infrastructure discovery
- Live site yardendamri.co.il/preview/ served by GitHub Pages + Cloudflare CDN
- Root (/) = old site. /preview = live new site. ALL changes must go to /preview only.
- Spent most of session editing wrong folder (root) — logged in MISTAKES.md
- Cloudflare Development Mode must be enabled to see changes immediately

### Fixes applied to /preview
1. White nav on scroll — deleted all .scrolled CSS rules (was turning nav white + hamburger black)
2. Duplicate WA buttons — deleted #wa-fab (hidden patch) + .wa-float (green). New single wa-btn: rose color, fits site palette
3. Hero video iOS autoplay — preload=none → preload=metadata
4. CSS version bumped to v=12
5. Root files — reverted all root changes back to original (root is not our concern)

## 2026-06-06 (Cloudinary → ImageKit migration session)

### Problem
- Cloudinary free plan exceeded 198% (49.09/25 credits used)
- Deactivation scheduled June 9, 2026
- Root cause: 1,535 images with f_auto,q_auto,w_800 transforms on every delivery + admin panel loading hidden thumbnails

### ImageKit account created
- URL endpoint: https://ik.imagekit.io/Yardendamri
- Public key: public_PLcivea4ZG8Ui6cG0j+BqiCc3oE=
- Private key: private_XBe+OET/tGijZaP1hhXDKR+MZWI=

### Migration attempted
- Script ran on Mac to upload 1,535 images from Cloudinary → ImageKit
- gallery-data.js URLs updated to ik.imagekit.io/Yardendamri/yarden_makeup/
- gallery-temp.html created with updated cdnUrl() function

### STATUS: BROKEN - Images not loading
- Root cause unknown: ImageKit API blocked from Claude sandbox, cannot verify filenames
- Likely issue: ImageKit appended random suffix to filenames during upload (e.g. yarden_makeup_18119542276602555_AbCdEf.jpg instead of yarden_makeup_18119542276602555.jpg)
- Videos still on Cloudinary (not migrated) — working fine
- gallery-data.js currently has ik.imagekit.io URLs — images broken on live site

### IMMEDIATE ACTION NEEDED (next session)
1. Open ImageKit dashboard → Media Library → yarden_makeup folder
2. Check actual filename of any file (does it have random suffix appended?)
3. If yes → re-upload with useUniqueFileName=false parameter
4. If no → debug why URLs are 404
5. Option B: revert gallery-data.js to Cloudinary URLs, remove transforms to save credits

## 2026-06-11

### Deployed to permanent files (admin.html, index.html, gallery.html)

**Admin panel:**
- initAdmin now waits for Worker fetch before rendering — hidden/cats/order all load correctly
- Hidden filter is a hard override — shows all 711+ hidden photos including ghost items (old URLs not in current gallery-data.js)
- Hero video picker now shows all R2 videos (fixed filter to include videos-new.yardendamri.co.il and .mp4 URLs)
- Gallery loads fast — spinner shown while Worker fetches, single render after

**Hero video:**
- Removed hardcoded src from <video> tag — no more flash of old video on load
- gallery-data.js now includes HERO_VIDEO/HERO_IMAGE/HERO_POSITION/HERO_ZOOM written by sync job
- Video plays instantly from gallery-data.js, Worker updates in background

**Likes & comments (web-wide):**
- New /social endpoint added to Cloudflare Worker (public, no password)
- social.json created in repo root as persistent store
- Both index.html and gallery.html now read/write likes+comments via Worker — web-wide for all visitors
- Removed all localStorage usage from likes/comments

**Thumbnail backfill:**
- backfill-thumbs.js + workflow created — uses Instagram thumbnail_url, no video download, ~3 min runtime
- Workflow triggered manually via GitHub Actions

## 2026-06-14
- **Desktop responsive fix (preview only)**: Added `@media (min-width: 1081px)` to `preview/styles.css`
  - `#about`, `#philosophy`, `#contact`: `max-width: 1440px; margin: auto` — cream bg matches body so boundary is invisible
  - `.services-header`, `.services-grid`: `max-width: 1280px; margin: auto` — inner content constrained inside full-width warm section
  - `#area`: calc-based left/right padding `max(100px, calc(50% - 700px))` caps content to ~1400px without clipping the warm background
  - `.ig-gallery-grid`: tile min bumped from 240px to 280px on large screens
  - Mobile breakpoint (`@media (max-width: 1080px)`) untouched

## 2026-06-14 (session 2) — Desktop responsive redesign (temp files)
- **preview/index-temp.html + preview/styles-temp.css** — all changes in temp files pending user approval
  1. **Hero video crop**: desktop now uses `38%` vertical position (face + neck + shoulders visible, not just eyes)
     - JS `applyHeroCropToPage()`: desktop safePos = `x + ' 38%'` instead of `50% 50%`
     - Resize listener added so crop recalculates on window resize
  2. **About section image**: changed `background-position:center top` → `center center` (shows full scene)
     - Added `.about-card { aspect-ratio: 16/9; max-height: none }` on desktop in styles-temp.css
  3. **Text / desktop layout**:
     - Hero title: `clamp(2.4rem, 3.2vw, 4rem)` — bigger, better proportioned on large screens
     - About title: `clamp(2.2rem, 3.2vw, 3.6rem)`
     - Philosophy attributes: added `.philosophy-attrs-grid` class → 4-column grid on desktop
     - Section max-width caps + gallery tile size inherited from styles.css and replicated in styles-temp.css
  4. **Gallery video thumbnails**: fixed broken poster URLs
     - Old code: `cdnVideoPoster(url)` generated Cloudinary paths that don't exist for R2 videos
     - New code: uses `item.thumb` (from gallery-data.js) or derives R2 thumb URL: `images.yardendamri.co.il/yarden_{item_id}_thumb.jpg`
     - Also fixed video detection: now checks `.mp4` in URL (R2 videos) not just `/video/upload/` (Cloudinary)

## 2026-06-19 — Desktop RTL layout: nav, about, area/map
- Nav desktop: logo moved to LEFT, nav-links to RIGHT using CSS order (order:2 / order:1 in desktop query only, mobile untouched)
- About: added grid-template-columns: 1fr 1.4fr on desktop — image column gets 58% width (was 50/50)
- Area/map: added order:2 to .area-visual on desktop — map moves to LEFT, text stays RIGHT (RTL natural)
- Cache-busted styles-temp.css link: ?v=20260619b

## 2026-06-19 — Desktop layout fixes: hero justify-content + philosophy photo
- Fixed `#hero justify-content` in base CSS: reverted to `flex-end` (restores mobile layout), added `flex-start` only in desktop `@media (min-width: 1081px)` block — text on right in RTL on desktop ✓
- Reprocessed philosophy photo: re-downloaded original (1600×1067), applied resize + gentle UnsharpMask only (no brightness/contrast boost), re-uploaded 119KB to R2 `aa6145a7-9efc-4bde-95ad-245544ef3bfc.jpeg` — less blown-out, natural B&W rendering

## 2026-06-18 — RTL/Hebrew audit + phone number bidi fix
- Audited all 13 preview pages: lang/dir attrs ✅, mobile menu RTL slide ✅, arrow icon direction ✅, no float usage, no broken bidi text — all correct.
- Bug found: footer phone "054-7276716" not wrapped in dir="ltr", risk of digit/hyphen reorder in RTL context.
- Fixed across all 12 pages showing the phone number (index, about, services, bride, bridal-guide, gallery, pricing, contact, reviews, disclaimer, accessibility-statement, cookies-policy). Pushed as -temp.html files, pending review.

## 2026-06-20 — Fix gallery-temp.html video autoplay
- Root cause: the confirmed fix from index-temp.html was NEVER applied to gallery-temp.html
- gallery-temp.html had: `data-src` (not `src`), no `autoplay`, `preload="none"`, observer checked `!v.src` (always false on iOS)
- Fix: `src="${item.u}"` direct, `autoplay`, `preload="metadata"`, `poster="${item.thumb}"`, observer uses WeakSet + just play()/pause()
