# Yarden Damri Website — Progress Log

## ✅ Completed

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
