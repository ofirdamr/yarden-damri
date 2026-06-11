# Progress Log

## Session — Homepage & Site Redesign (June 2026)

### Completed
- **index.html** — full homepage redesign:
  - Philosophy section: replaced emoji attributes with editorial B&W photo (aa6145a7) + quote overlay + clean 2×2 grid
  - Area section: replaced broken dark square with real Google Maps iframe (grayscale)
  - CTA strip: cleaned to single WhatsApp button
  - Reviews section: removed Google/דפי זהב/Facebook button cluster, restyled cards to site palette, added Google review CTA link, fixed empty state text
  - Contact section: replaced dark biz-card with premium cream/gold business card
  - Share strip: moved from standalone div to inside gallery section
  - About section: rewritten — short, warm, punchy. Links to about.html
  - Floating buttons: smaller, subtle, grouped left (a11y + scroll) / right (WhatsApp)

- **about.html** — full rewrite:
  - New structure: Hero + Story + Experience + CTA (4 sections)
  - New copywriting throughout — warm premium voice, not corporate
  - Hero: "את יפה. אני כאן להראות את זה."
  - CTA links to pricing.html and WhatsApp

- **styles.css** — rhythm fix applied to all pages:
  - services → var(--warm)
  - area → var(--warm)
  - reviews → var(--warm)
  - Alternating cream/warm pattern across full page

- **pricing.html** — title fixed: "כמה זה עולה?" → "החבילות שלי"

### Pending / Next Session
- Review remaining pages for consistency: services, contact, reviews, gallery
- Instagram feed token fix (keyword: גרעינים)
- Cloudflare R2 video hosting ($0 cap, migrate 289 videos)
- Hero video fix (Worker KV CDN path)
- Google Places API real reviews integration
- Bezeq Bcyber block status check

## June 2026 — Media Migration & Fixes

### Completed
- Migrated all media from Cloudinary (closed) to R2: images→yarden-images, videos→yarden-videos-new
- Images compressed WebP 800px, videos H.264 720p via ffmpeg in sync script
- Fixed Instagram likes/comments: removed sessionStorage (broken on iPhone incognito), fetch fresh on load
- Fixed stats for 1608 posts including carousel children
- Root and preview gallery-data.js + instagram-stats.json now auto-synced on every workflow run
- Removed all Cloudinary references from codebase
- Fixed admin video picker to derive _thumb.jpg, fallback to video element
- Fixed gallery: lazy loading, viewport autoplay, PAGE_SIZE=24, hidden items working
- Sync workflow fixed: no hang, parallel stats fetch, skips existing items
- Created ARCHITECTURE.md

### In Progress
- Hero video thumbnails: _thumb.jpg not yet generated for existing 161 videos
- Hero video flash: dark screen before video plays (needs thumbnails)

### Next
- Backfill _thumb.jpg for all existing R2 videos (GitHub Action)
- Site responsiveness on desktop
- SEO, security audit
- Go-live: promote /preview → root
