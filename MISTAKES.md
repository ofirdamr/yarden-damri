# Mistakes Log

## 2026-05-25

### ❌ Added pricing to mobile menu when it should be hidden
- **What happened:** When fixing mobile menu links, added `/pricing.html` to match desktop nav — but pricing page is not ready and should be hidden from all navigation until built.
- **Rule:** Never add pricing.html to any nav (desktop or mobile) until explicitly told it's ready.
- **Fixed:** Removed pricing from desktop + mobile nav in index.html, services.html, gallery.html, bride.html.

### ❌ Did not update PROGRESS.md after gallery fix
- **What happened:** Fixed gallery cached-image bug but forgot to append to PROGRESS.md.
- **Rule:** Every fix → update PROGRESS.md in same commit or immediately after.

### ❌ services.html had dark footer text on dark background (invisible)
- **What happened:** Footer in services.html used inline styles `color:rgba(62,42,26,.45)` (dark brown) on dark background — completely unreadable.
- **Rule:** When copying footer markup between pages, use the canonical `<footer role="contentinfo">` from index.html — no custom inline styles. Let styles.css handle it.
- **Fixed:** Replaced services.html footer with index.html footer markup.

### ❌ disclaimer.html had white text on cream background
- **What happened:** Inline style `.legal-body{color:rgba(255,255,255,.75)}` (white) used while body bg is var(--cream) — invisible.
- **Rule:** Subpages use `var(--text)` for body text. White text is only for dark sections (footer, charcoal bg).
- **Fixed:** Replaced all rgba(255,255,255,...) text colors with var(--text), updated nav/footer to canonical.

### ❌ Admin pricing tab was empty
- **Cause:** switchTab() only looped over ['gallery','cats','settings','analytics'] — 'pricing' was missing, so tab-pricing div was never shown.
- **Fix:** Added 'pricing' to the array.

### ❌ Push failures went undetected — 5 commits never reached GitHub
- **Cause:** Instagram Auto Sync GitHub Action committed to remote main. My local push got rejected ("fetch first"). Git showed a hint but I missed it — kept committing locally for 5 commits without noticing the pushes were rejected.
- **Fix:** Pulled with merge, pushed.
- **Rule:** ALWAYS check 'tail -3' of git push output for 'rejected' or 'fetch first' warnings. If push appears to succeed but says 'fetch first', it FAILED.

### ❌ bride.html and gallery.html had non-canonical footer markup
- **What happened:** Both pages used `<footer style="background:#1a1008...">` with inline styles. bride.html had dark brown text `rgba(62,42,26,.45)` on dark background `#1a1008` — links were invisible. gallery.html used `rgba(255,255,255,.4)` which was visible but still non-canonical.
- **Rule:** ALL pages must use `<footer role="contentinfo">` without inline background/color styles. Only the canonical markup from index.html. This applies even if the page previously had a dark-themed custom footer.
- **Fixed:** Replaced both footers with canonical markup.

## Social pills size mismatch (mobile menu vs footer)
**Mistake:** Used only `width/height: 44px` without `min-width/max-width` locks, so SVG sizes inside (15px vs 16px in HTML attributes) and flex parent behavior caused visual size differences between mobile menu social pills and footer social pills.
**Fix:** Added `min-width/min-height/max-width/max-height: 44px` + `flex-grow: 0` + forced SVG to 18px via CSS. Both pairs now identical regardless of HTML attribute differences.
**Lesson:** When two elements with same class must look identical across different parent containers, lock all size dimensions (min/max) and standardize inner element sizes via CSS, not HTML attributes.

## Repeated patching of social pills failed
**Mistake:** Kept patching `.mobile-social .social-pill` and `.footer-social-pills .social-pill` with overrides (min-width, max-width, !important attempts). Old CSS rules and inconsistent SVG attributes kept causing visual differences.
**Fix:** Deleted old classes entirely (`mobile-social`, `footer-social-pills`, related `.social-pill` overrides) from HTML and CSS. Built fresh `.social-circles` + `.social-circle` with one clean rule. Same block reused in mobile menu and footer.
**Lesson:** When patches stack and still fail, delete and rebuild from scratch with new class names — no chance of cascade conflicts.

## Mismatched viewBoxes caused visual size difference
**Mistake:** Used Instagram SVG with 24x24 viewBox (path fills full area) and TikTok SVG with 32x32 viewBox (path only fills ~75% of area). When both rendered at 20x20 in CSS, the TikTok logo appeared visually smaller. Also the radial-gradient bright spot made IG circle look larger.
**Fix:** Both SVGs now use 24x24 viewBox with paths filling the full area. Both icons are pure white (still authentic — both brands use white logos at small sizes). Added max-width/max-height + line-height: 0 + padding: 0 to fully lock circle dimensions.
**Lesson:** When matching two icons visually, viewBox dimensions and path coverage matter more than CSS width/height. Check actual SVG path bounds, not just the viewBox numbers.
