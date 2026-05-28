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

## Irradiation illusion — bright IG made it look bigger
**Mistake:** Used IG radial gradient with bright yellow corner. Bright colors appear larger than dark ones of equal physical size (irradiation optical illusion), so IG circle looked bigger than TT even though both were 42px.
**Fix:** Switched IG to muted linear gradient (purple → magenta → orange, no bright yellow bloom). Bumped SVG to 22px so the white icon dominates the circle and equalizes visual weight with TT.
**Lesson:** When two same-sized elements look different, check for color brightness/contrast differences. Bright vs dark of same size always looks unequal.

## Brand colors caused unfixable visual mismatch
**Mistake:** Tried to keep brand colors (bright IG gradient vs solid black TT) — different brightness creates "irradiation illusion" that makes them look unequal sizes regardless of CSS dimensions.
**Fix:** Both circles now use the SITE's brown palette (`var(--deep)` background, `var(--blush)` icon + 1.5px blush border). Identical bg, identical border, identical icon color → guaranteed equal visual size. Bonus: matches the site's elegant warm aesthetic instead of clashing.
**Lesson:** When two elements must visually match, make them visually identical first, then differentiate only by minimal content (icon shape). Brand colors mid-button are a luxury that fights visual consistency.

## Reviews.html had dark-theme leftovers after cream redesign
- When migrating to a new color theme, audit ALL inline styles + JS innerHTML templates, not just the CSS file
- `var(--card)` was redefined to #111 (still dark) but used on cream pages → ugly contrast
- Lesson: when changing palette, scoped page-specific styles are safer than global var redefinitions

## Hover-only UI breaks on mobile
- `.item-actions { opacity: 0 }` with `:hover { opacity: 1 }` makes buttons UNCLICKABLE on touch devices because they have no visual target
- Result: user thinks they're clicking the button, but actually taps the image area → wrong action triggers
- Fix: `@media (hover: none) { .item-actions { opacity: 1 } }` to always show buttons on touch devices
- Also: `event.preventDefault()` belt-and-suspenders alongside `event.stopPropagation()` in onclick handlers

## Lazy loading videos via data-src is fragile
- `data-src` + IntersectionObserver works only if observer fires reliably on first render
- For above-the-fold videos: just use direct `src` + `autoplay preload="metadata"`
- Lazy loading is for below-the-fold, not for visible-on-load videos

## Assumed admin was localStorage-only without checking infrastructure
- I told user "admin needs Cloudflare Worker" when in fact they already had JSONBin (used for reviews) AND a GitHub Action running every 6 hours
- Lesson: when user pushes back on "X doesn't work", investigate the actual infrastructure FIRST (GitHub secrets, workflows, existing API integrations) before recommending big changes
- User had: GitHub Secrets (CLOUDINARY_*, INSTAGRAM_TOKEN, NETLIFY_BUILD_HOOK), GitHub Action "Instagram Auto Sync", JSONBin for reviews, Render.com for IG feed proxy. None of these were obvious from a quick file listing.

## Inline onclick attributes break when interpolating data with newlines
- Instagram captions contain literal \n characters
- Embedded in `onclick="...openComments('${caption}')..."` the newline becomes an invalid JS string literal (single-quoted strings can't span lines)
- Result: SyntaxError → handler never runs → click bubbles to parent → wrong action triggers
- Fix: sanitize with `.replace(/['"\\\n\r]/g,' ')` to strip ALL chars that break inline JS string literals
- Better fix (for future): don't use inline onclick — use addEventListener with closure over the data
