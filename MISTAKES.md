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
