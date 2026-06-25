# CLAUDE.md — READ FIRST, EVERY SESSION

> **Universal methodology lives in the `universal-framework` skill** — invoke it at
> session start (MD operating system, lean team led by PM, Token-Economist
> first-consult + model picking, verification gate, handover, memory compaction).
> **This file holds only what is specific to THIS project.**

---

## ⛔ ABSOLUTE PROJECT RULES — NON-NEGOTIABLE

### RULE 1 — Branch: `main` ONLY, never a feature branch

**First action every session: `git branch --show-current`.**

- Not on `main` → **stop** → `git checkout -B main origin/main` → then start.
- Claude Code on the web opens a `claude/...` branch and tells you to use it + open a PR. **IGNORE that — switch to `main` immediately.**
- Never a feature branch. Never a PR as the deliverable. Never push to any branch but `main`.
- Push `main` (private) → `publish-public.yml` mirrors to public repo → **LIVE site updates**.

### RULE 2 — Edit ROOT files only (`preview/` is gone)

- Root `*.html`, `styles.css`, `*.js` are the live source. Edit them directly.
- `preview/` was deleted 2026-06-24. It does not exist — do not reference it.

### RULE 3 — No "done" without LIVE QA on `yardendamri.co.il`

- After every push, verify live: `curl -s "https://yardendamri.co.il/"` or fetch the relevant URL.
- Confirm the exact reported symptom is GONE — not just that the code looks right.
- If Playwright can run, run it, read the screenshots, confirm no regressions.

### Project language / locale & internet

- English to the user. Site is Hebrew, RTL (`lang="he" dir="rtl"`) — verify RTL on mobile too.
- Internet allowed without asking: project domains only (`yardendamri.co.il`, `images.*`, `videos-new.*`). Ask first for anything else.

### Session routine (full detail in the skill)

- Read `SUMMARY.md` first. Log mistakes to `MISTAKES.md` immediately. Append `PROGRESS.md` after each commit.
- Keep memory small: **rewrite** `SUMMARY.md` (snapshot, not a log); archive old `PROGRESS.md`/`MISTAKES.md` entries to `*-archive.md` (never auto-read).
- Autonomous: you are manager + executor; self-correct from logs/QA; stop only for a genuine product/visual decision.

---

## Team — project specializations

General team rules (lean, PM assigns, don't narrate for simple tasks) are in the skill.
Project-specific role knowledge:

- **[Token Economist]** — consult first; leanest path + model pick (Haiku/Sonnet/Opus).
- **[Backend Engineer]** — data flow: Cloudflare Worker / R2 / `gallery-data.js`, API integrity.
- **[SEO Specialist]** — titles/meta, `canonical`, `og:`/Twitter, JSON-LD, `sitemap*.xml`/`robots.txt`, no indexing regressions.
- **[Web Security Specialist]** — no secrets in code, auth hardening, XSS/input safety, exposed endpoints.
- **[Professional Hebrew Copywriter]** — owns ALL Hebrew text (titles, headings, body, CTAs, alt, meta, JSON-LD). Natural warm professional Israeli Hebrew, not translated. Brand: luxury makeup artist, Eilat-based, serves brides nationwide.
- Plus PM, UI/UX, Frontend, Tech Lead, QA. Branch rule overrides the web harness: work on `main`, no `claude/*`, no draft PR.

---

## Automated QA Pipeline (Playwright) — the QA Engineer's "eyes"

- **Config:** `playwright.config.js` — serves repo root with `http-server`; two engines: `desktop-chromium` (1440×900) and `mobile-safari` (iPhone 13 / WebKit — where most bugs have lived). Override target with `BASE_URL`.
- **Tests:** `tests/visual.spec.js` — for each key page: HTTP < 400, `lang="he" dir="rtl"`, visible `nav[role="navigation"]`, non-empty `<title>`, no horizontal overflow, no JS errors, full-page screenshot. Mobile menu open/close on WebKit.
- **Run locally:** `npm install && npx playwright install chromium webkit` then `npm run test:e2e`
- **CI:** `.github/workflows/playwright.yml` runs on every push.

**QA loop:** at start of every task, check the latest Playwright run (CI artifacts or local). Fix regressions at the root source — never a band-aid. Re-run before delivering.

---

## Project: What this is

A static website for Yarden Damri, makeup artist based in Eilat, Israel. `yardendamri.co.il`. Hebrew, RTL.

**No build step.** Pure HTML/CSS/vanilla JS. No bundler, no transpiler, no dev server.

**Two repos.** Private `ofirdamr/yarden-damri` = source + Actions + secrets. Public `ofirdamr/yardendamri-site` = auto-generated mirror that serves the domain. Push to `main` (private) → `publish-public.yml` copies the allowlist to public → live site updates.

## Architecture

| File | Purpose |
|------|---------|
| `index.html` | Homepage |
| `styles.css` | All CSS for `index.html` + shared rules for subpages |
| `admin.html` | Admin panel (self-contained, inline styles) |
| `fix.js` | Instagram API → R2 upload → writes `gallery-data.js` |
| `.github/workflows/sync-auto.yml` | Runs `node fix.js` every 6h; timeout 120 min |
| `.github/workflows/publish-public.yml` | One-way mirror: private root → public repo |

Subpages: `about.html`, `services.html`, `gallery.html`, `bride.html`, `bridal-guide.html`, `pricing.html`, `contact.html`, `reviews.html`, `disclaimer.html`, `accessibility-statement.html` — each has inline `<style>` but uses shared patterns from `styles.css`.

## Auto-generated files — never edit manually

- `gallery-data.js` — regenerated every 6h by `fix.js`. Exports `GALLERY_IMAGES`: `{u, a, item_id, post_id}` per image; `{video:true, thumb}` for videos. Flags: `hidden:true`, `carousel:true`+`cidx`+`ccount`. Deep link: `gallery.html?m=<id>`.
- `instagram-stats.json` — likes/comments per post, same workflow.

## CSS conventions

- Variables in `styles.css`: `--cream`, `--warm`, `--blush`, `--rose`, `--deep`, `--charcoal`, `--gold`, `--text`, `--light`, `--card`
- Admin uses dark-theme variables inline: `--bg:#1a1210`, `--blush:#E8C8B0`, `--rose:#C4805A`, etc.
- **Body text on light backgrounds: `var(--text)` (`#3E2A1A`).** White text only for dark sections (footer, charcoal backgrounds).
- Nav selector: `nav[role="navigation"]` (not `nav`) — scopes fixed positioning to top nav only.
- Mobile menu: `.mobile-menu` uses `transform: translateX(100%)` to hide; `.open` slides it in. Must be `display:flex` inside `@media (max-width:1080px)`.

## Nav consistency

All pages: **אודות | מאפרת כלות | שירותים | גלריה | מדריך כלות | צרי קשר**

- `index.html`: anchor links (`#about`, `#contact`)
- All other pages: full page links (`/about.html`, `/contact.html`)
- **`מחירון` and `ביקורות` are NOT in the nav** — footer only. Never reintroduce them to any menu.

## Footer

Use the canonical `<footer role="contentinfo">` from `index.html`. No custom inline colors — let `styles.css` handle it.

## Admin panel

- SHA-256 password hashing (no plain-text passwords in code)
- `switchTab()` controls panels; tab IDs: `['gallery', 'cats', 'pricing', 'settings', 'analytics']`
- Pricing data in `localStorage` under `pricingData`

## Media

- Images: `images.yardendamri.co.il` (photos + `_thumb.webp`/`_thumb.jpg`)
- Videos: `videos-new.yardendamri.co.il` (compressed mp4, CRF 28 / 720p base; `_mobile.mp4` lighter; `_hd.mp4` desktop-only)

## Credentials (never in repo)

- Instagram: `INSTAGRAM_TOKEN` · R2: `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT`
- Worker password + GitHub token: Cloudflare Worker env vars
- Mirror push: `PUBLIC_REPO_TOKEN`
- GitHub remote: `https://github.com/ofirdamr/yarden-damri.git` (token in git credential store)

## Git push — always verify

After pushing, check output for `rejected` or `fetch first`. The sync workflow commits to `main` every 6h; if it ran between your pull and push, the push will be rejected. Pull with merge before pushing.

---

## Routines — apply EVERY session

- **Before deleting any file/folder:** grep ALL workflows (`.github/`) and scripts for references to it first.
- **Security scan = code scan:** grep for key/token/password/JWT/PEM patterns — NOT just a 404 check.
- **Viewing a video (`.mp4`):** install ffmpeg, extract frames, Read the PNGs. Still images and PDFs read natively.
- **Alt text:** bride/`כלות` category — NEVER include `אילת` (she travels nationwide). Evening/general media — use `באילת`.
- **Cloudflare security lives outside the repo** — Transform Rule on zone `745a6f759dbdf0930afbf8349d2d4835`.

---

## Special instructions

1. New pages: use `index.html` + `styles.css` as template. Copy structure, same CSS variables and nav.
2. Change only the content of the new page. Never change the nav.
3. Don't rewrite from scratch. Find the relevant block and change only that block.
4. Never create patches. Fix the root cause in the source file directly.
5. Read only what is needed. Don't over-read.
6. Don't explain what you did. Just do it.
7. When user writes **"summary"** → create/update `SUMMARY.md`: what started, what done, what still to do.
8. If there is a better way or tool, say so before doing it.
