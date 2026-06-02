# Summary — May 2026

## Status: IN PROGRESS

## Last session work
3 tasks completed:

### 1. accessibility-statement.html — DONE
- Replaced old standalone header/footer with preview site's nav (subpage-nav, mobile menu, footer)
- Kept all content, added scoped CSS class `.a11y-page-wrapper` to avoid conflicts

### 2. Admin — Category public/private toggle — DONE
- Added `privateCats[]` array to settings (saved to cloud)
- Each category in admin shows 🌐 ציבורי / 🔒 פרטי toggle button
- gallery.html: private categories hidden from filter bar AND their images hidden from gallery

### 3. Admin hero media expansion — DONE
- Added image picker tab alongside video picker (tab UI: 🎬 וידאו / 🖼️ תמונה)
- Added object-fit select (cover/contain/fill)
- Added object-position select (9 presets: מרכז, למעלה-ימין, etc.)
- clearHeroMedia() resets all hero settings
- index.html: applies heroImage, heroFit, heroPosition; switches video→image when heroImage is set
- remote-state.js: added getHeroImage, getHeroFit, getHeroPosition helpers

## Pending from last session (still open)
— all resolved —

1. Issue #2 — nav-cta button visibility on subpages — DONE
2. Issue #4 — admin pricing: addPricingItem missing persistPricing() — DONE
3. Issue #5 — admin gallery: uncategorized filter — DONE

## Repo
https://github.com/ofirdamr/yarden-damri.git
Working folder: /preview

## Mistakes log
- **privateCats bug**: fixed `remote-state.js` but the site uses `cloud-storage.js` — always check BOTH files when changing RemoteState API. admin.html and gallery.html both load `cloud-storage.js` (line 113 in admin.html).
