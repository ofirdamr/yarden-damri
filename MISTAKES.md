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
