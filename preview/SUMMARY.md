# Summary — June 2026

## Status: IN PROGRESS

## Last session work — SEO + Content updates

### 1. SEO audit & fixes — DONE
- Fixed sitemap: removed reviews.html (404), pricing.html redirect, duplicate gallery entry
- Added noindex to admin.html (security)
- Added canonical tags to all pages missing them
- Added static SEO content to pricing.html (prices readable by Google)
- Created sitemap-media.xml with 80 images + 30 videos (fixed emoji issue causing fetch failure)
- Created sitemap-index.xml referencing both sitemaps
- Submitted sitemaps + requested indexing for all 7 pages in Search Console

### 2. Google Analytics + Search Console — DONE
- Fixed OAuth redirect_uri_mismatch (hardcoded redirect to /admin.html)
- Fixed 403 access_denied (published OAuth app to production)
- Enabled Google Analytics Data API in Google Cloud
- Added bounce rate insight panel to admin analytics tab
- Added specific traffic sources (instagram, google etc.) — not just channel groups
- Added region+city location data
- Added Search Console setup guide in keywords section
- Enabled Google Signals + Reporting Identity = מעורב (demographics data incoming)

### 3. Reviews page — DONE
- Created reviews.html with Google Places API integration
- Place ID: ChIJCT7WZcVzABUR-tcZLqfCp1c
- Added to nav on all pages + sitemap
- Places API key restricted to domain

### 4. Content updates (Gemini copywriting) — DONE
- preview/services.html: new H1 (nationwide, no Eilat in title), new intro paragraph, 4 main cards with bullet points, 2 secondary cards (הפקות + שירותים נוספים), FAQ section
- preview/bridal-guide.html: new hero intro, 4 steps (was 5), removed AI language (הידרציה etc.), warm personal tone, ✅/❌ bullet lists per step

## Pending
- Gemini may have more pages to update (about, bride, contact?)
- Stage 2 head video feature: display selected video on homepage (pending decision)
- Hebrew font change (Cormorant Garamond or David Libre) — not finalized
- reviews.html: not yet in sitemap of ROOT site (only preview)
- Demographics data: will appear in 24-48h after Google Signals activated

## Repo
https://github.com/ofirdamr/yarden-damri.git
Working folder: /preview

## Key credentials
- GA4 Property ID: in admin.html
- OAuth Client ID: 243162243510-kdto966o5fofbu62rbvfegvstp9nlmnm
- Places API Key: AIzaSyCEEhecaLf_jOkEDHd0q0fcioEODD6gMwQ
- Place ID: ChIJCT7WZcVzABUR-tcZLqfCp1c
