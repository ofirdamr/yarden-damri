# Mistakes & AI Errors Log — Preview

## Floating card banner covered hero content (2026-06-13)
- Applied glassmorphism card design (`bottom: 90px`, large card) without previewing on the actual page. The card landed in the middle of the hero section, covering the headline and CTA buttons.
- Should have created `cookie-banner-temp.js`, checked it visually, confirmed before touching permanent file.
- **Rule:** Before any visual change to a floating/fixed element, think about where it will land relative to page content at `bottom: Xpx`. Always test on temp first.

## Edited cookie-banner.js directly without temp file (2026-06-13)
- Changed `cookie-banner.js` (permanent) and bumped cache-bust on all HTML pages without creating a temp version first.
- User confirmed: never do this — ALL changes go to `-temp` files until explicitly approved.
- **Rule:** Any change to a permanent file in `/preview` must first go to a `-temp` version. Only overwrite the permanent file after the user says "make it permanent" or equivalent explicit approval.

## Font changed without checking source (June 2026)
- Swapped nav font to Cormorant Garamond / Heebo without checking original CSS. Original is Rubik weight 400 (name) + weight 300 (subtitle).
- **Rule:** Before any typography change, check current CSS and git history.

## WhatsApp floating button alignment (June 2026)
- Changed `<a>` to `<button>` mid-session without solving root cause.
- Used `!important` overrides repeatedly instead of fixing the underlying rule conflict.
- Accepted fake selectors from Gemini (`#whatsapp-widget-container`, `[class*="elfsight-app"]`) — don't exist in codebase.
- Mixed `bottom` values (24/28/30/32px) across scoped and global rules — never audited all occurrences first.
- **Rule:** Before touching floating button CSS, grep ALL occurrences, confirm one source of truth, make one clean change. Never fight `!important` with another `!important`.

## Edited permanent file directly (June 2026)
- Edited `bride.html` directly instead of creating `bride-temp.html`. Reverted via git revert.
- **Rule:** ALWAYS create `-temp` file first. Only overwrite permanent after explicit approval.

## Overwrote preview/reviews.html directly (June 2026)
- Interpreted "update the reviews temp" as permission to deploy. It was not.
- **Rule:** "Update the temp" ≠ permission to overwrite permanent. Wait for explicit approval.

## GitHub Pages cache delay (June 2026)
- Pushed changes, user saw nothing for hours. Forgot CDN propagation delay.
- **Rule:** After pushing, always warn: "GitHub Pages takes 5–10 min. Add `?v=N` to bust browser cache."

## Edited preview/styles.css directly (June 2026)
- Modified `preview/styles.css` directly AND edited root `index.html` / `styles.css` (not approved).
- **Rule:** Never touch original files in `/preview`. Always create `-temp`. Never touch root files.

## Hidden items showing in lightbox (June 2026)
- `applyFilter('all')` called before `RemoteState.fetchPublic()` completed — hidden items not loaded yet.
- **Rule:** Always await RemoteState before first render when hidden items must be excluded.

## getAdminSettings() used localStorage in root gallery (June 2026)
- Root gallery.html read from localStorage instead of RemoteState.
- **Rule:** Always use RemoteState for shared state. Never localStorage for business data.

## 2-Day Likes/Comments Debug (June 2026)
- `sessionStorage` throws silently in incognito on iPhone — igStatsCache never populated.
- Root and preview `gallery-data.js` were out of sync — different post_ids.
- `post_id` missing from gallery items — skip-existing path in fix.js didn't update it.
- `instagram-stats.json` not copied to preview on sync — stale stats.
- **Rules:**
  - Check sessionStorage/localStorage usage first — Ofir uses iPhone incognito, neither works.
  - Always keep root gallery-data.js = preview/gallery-data.js in sync.
  - One fix at a time, verify before next. Never patch around broken code.

## Admin video picker showed black tiles (June 2026)
- .mp4 URLs set as `<img> src` — browsers can't render MP4 as image.
- **Rule:** Never use .mp4 as `<img>` src. Always derive a `_thumb.jpg` path.

## Hero video flash (June 2026)
- No poster for existing R2 videos (thumbnails not yet generated).
- **Rule:** Always generate and store a thumbnail when uploading any video.

## Cookie banner used wrong site palette (June 2026)
- Used `#3E2A1A` (root site's `--text` color) instead of preview's `#111111` (charcoal).
- Preview palette is different from root: charcoal is `#111111`, gold is `#B89060`, blush is `#D4A898`.
- **Rule:** Always check `preview/styles.css` CSS variables before hardcoding colors. Never copy from root styles.

## nav-logo showed as blue link on subpages (June 2026)
- Subpages need `class="subpage-nav"` on `<nav>` to apply `color: var(--charcoal)` via styles.css line 566.
- Without it, the `.nav-logo` anchor inherits browser default blue.
- **Rule:** All subpages must have `class="subpage-nav"` on the `<nav role="navigation">` element.

## nav.js reference used instead of inline JS (June 2026)
- Created temp page with `<script src="nav.js" defer>` — `nav.js` does not exist in preview.
- Nav JS is inline at the bottom of each page (copied from disclaimer.html).
- **Rule:** When creating a new page, copy the inline `<script>` block from the bottom of `disclaimer.html`. Never reference `nav.js`.

## Created unnecessary feature branch (2026-06-13)
- Created `claude/preview-security-refactor-gyoow0` for the security refactor instead of working on `main`
- This caused: workflow_dispatch invisible (only shows on default branch), files not live at yardendamri.co.il/preview/, diverged histories requiring MCP API to push directly to main
- **Rule:** This project uses `main` only. Never create feature branches.

## Tried to push to main without pulling first (2026-06-13)
- After creating temp branch and committing, tried `git push origin main` — rejected (non-fast-forward)
- Had to use `--force-with-lease` after amending the tip commit
- **Rule:** Always `git pull origin main` before pushing, especially after rebasing or amending.

## 2026-06-19 — Falsely claimed ImageKit images were "dead/403" sitewide
- Sandbox network allowlist blocks ik.imagekit.io AND images.yardendamri.co.il (R2 custom domain) — curl returns 403 `host_not_allowed` for BOTH, from the egress proxy, not from the actual remote server.
- I incorrectly treated the ImageKit 403 as proof the image was broken on the live site, and replaced a user-chosen photo with a random gallery photo without confirming first.
- Rule: sandbox curl 403 with `x-deny-reason: host_not_allowed` means "I cannot verify this from here" — NOT "this URL is broken." Never claim an image/URL is dead based on sandbox curl results alone. Ask the user to confirm in their own browser before touching chosen media.
