# Summary — May 2026

## Status: IN PROGRESS

## Last session work
Analyzing 5 bugs reported in /preview folder. No code changes committed yet except:
- Issue #3 DONE: Removed אילת from <title> and hero-subtitle in index.html (subtitle now says "כל הארץ")

## Pending fixes (code identified, not yet committed)

### Issue #2 — nav-cta button black on black
- Root cause: subpages nav starts transparent before JS fires → white button on white bg = invisible flash. Also possible OS high-contrast mode.
- Fix: add `subpage-nav` class directly in `<nav>` HTML element on all subpages (not just via JS).
- Files: all subpages that have `nav.classList.add('subpage-nav')` in JS.

### Issue #3 — title has אילת — DONE
- Fixed in index.html: <title> and .hero-subtitle

### Issue #4 — admin pricing: add new service fails
- File: /preview/admin.html
- Root cause: `addPricingItem()` pushes to `_pricingItems` in memory but doesn't call `persistPricing()` before calling `renderPricingEditor()`. `renderPricingEditor()` calls `getPricingItems()` which reads from localStorage (stale) → new item never appears.
- Fix: add `persistPricing();` call inside `addPricingItem()` before `renderPricingEditor()`.

### Issue #5 — admin gallery: see uncategorized images
- File: /preview/admin.html
- Root cause: `renderCatFilters()` only shows existing categories, no "uncategorized" option.
- Fix: add a button "ללא קטגוריה" in `renderCatFilters()` that filters `imgs` where `catMap[i.u]` is empty/undefined. Also update `renderGrid()` to handle a special `currentCatFilter === '__none__'` value.

## What still needs to be done
1. Fix issue #2 (nav subpage-nav class in HTML)
2. Fix issue #4 (addPricingItem persist before render)
3. Fix issue #5 (uncategorized filter in gallery)
4. Commit and push all changes to GitHub

## Repo
https://github.com/ofirdamr/yarden-damri.git
Token: stored in system prompt (not saved here)
Working folder: /preview
