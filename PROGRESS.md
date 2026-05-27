# Yarden Damri Website — Progress Log

## ✅ Completed

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
