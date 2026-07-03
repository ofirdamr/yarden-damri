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
- **Gallery/hero changes ALWAYS require a VISUAL render check before saying "done"** (owner
  standing order). Render the page (local server + Chromium, or live) and READ the screenshot
  on BOTH desktop and mobile. Test the worst case (e.g. autoplay-blocked = video aborted, so
  the poster still must show, never a dark/blank box). Never declare a gallery/hero fix done
  on code inspection alone.
- **Know your verification tooling's blind spots BEFORE you ship, not after.** If this sandbox
  cannot actually observe the real result of THIS change (e.g. headless Chromium has no H.264
  decoder → can't watch real video autoplay/reveal; proxy blocks reaching the live site) — say so
  explicitly up front. Local Playwright/DOM/curl checks that don't cover the actual visual behavior
  do NOT make the change "done" — treat it as unverified-in-practice and say so, then get the
  owner's live confirmation, instead of reporting success on partial checks (session 10 lesson,
  see `MISTAKES.md` 2026-07-01).
- Browser proxy note: Chromium must use the CURRENT `$HTTPS_PROXY` (the port changes between
  sessions). External CDN images (`images.*`) may fail through the proxy in headless — fetch
  the asset with `curl` and serve it via Playwright `page.route(...fulfill)` to render it.

### RULE 4 — Media reveal architecture is 🔒 LOCKED (change ONLY with explicit owner permission)

The grid AND hero share one deliberate, approved "Instagram-polished" pattern: the still **image
shows instantly** (no background flash), the **video lays on top and fades in only once it actually
plays**. This look is final. **Do NOT modify it** — markup, CSS, opacity/`display`/z-index, the
`'playing'` reveal, the IntersectionObserver, or `tilefade` — **without the owner explicitly saying so.**

- **Grid** (`renderGrid` + `observeGalleryVideos` in `index.html`): tile cream placeholder `#efe7df`
  → thumbnail `<img>` (`_thumb.webp`, `onerror`→`_thumb.jpg`) fades in via `animation:tilefade`,
  `object-fit:cover`, and **always stays**. An IntersectionObserver (threshold 0.2) lays an
  autoplaying `<video>` (`muted` `loop` `playsinline` `autoplay` `preload=metadata`) **on top**,
  `opacity:0` → `opacity:1` **only on the `'playing'` event**; paused + `opacity:0` when off-screen.
  Autoplay-blocked → thumbnail stays, a tile **NEVER goes blank**. Many videos autoplay at once **on purpose** (works on mobile).
- **Hero** (`#heroMediaWrap`): `#heroImage` (poster `_thumb.jpg`) = `display:block`, `z-index:0`,
  **always behind**. `#heroVideo` = `opacity:0` → `opacity:1` on `'playing'`, `z-index:1` on top.
  **Never `display:none` the poster** (that re-creates the blank/dark hero when autoplay is blocked).
- **Locked scope includes script loading order/timing, not just CSS/markup.** `defer`/`async`,
  extracting inline scripts, or reordering anything in the gallery/hero load path counts as touching
  this rule if it changes WHEN or HOW the reveal fires — timing is not a loophole around "markup/CSS".
- If a task seems to need touching this, **STOP and ask the owner first.**
- **"Do it" on a scoped, named task is not blanket permission to also reinterpret this rule's
  boundary.** If the task sits adjacent to RULE 4 (e.g. it touches script timing for the
  gallery/hero path), name that boundary explicitly and get an explicit yes on THAT specific
  point before proceeding — don't decide unilaterally that your interpretation of "locked" is
  narrower than the rule as written (session 10 lesson, see `MISTAKES.md` 2026-07-01: a "do it"
  for a render-blocking-scripts fix was over-extended into a live-breaking hero/gallery timing
  change that had to be reverted).

### RULE 5 — No em dash (`—`) anywhere

(Generic rule lives in the skill.) Enforced here in the Worker `/copywriter` prompt + a strip
step; keep it that way.

### Project language / locale & internet

- English to the user. Site is Hebrew, RTL (`lang="he" dir="rtl"`) — verify RTL on mobile too.
- Internet allowed without asking: project domains only (`yardendamri.co.il`, `images.*`, `videos-new.*`). Ask first for anything else.
- **Replies to the user: max 3-4 sentences, no exceptions.** Owner reads on mobile, cannot process long output. State the result and next step only — no restated context, no step-by-step narration of tool calls.

### Session routine

(MD operating system + memory compaction: see skill.) Autonomous: self-correct from logs/QA;
stop only for a genuine product/visual decision.

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

## Automated QA Pipeline (Playwright)

- **Config:** `playwright.config.js` — serves repo root with `http-server`; two engines: `desktop-chromium` (1440×900) and `mobile-safari` (iPhone 13 / WebKit — where most bugs have lived). Override target with `BASE_URL`.
- **Tests:** `tests/visual.spec.js` — for each key page: HTTP < 400, `lang="he" dir="rtl"`, visible `nav[role="navigation"]`, non-empty `<title>`, no horizontal overflow, no JS errors, full-page screenshot. Mobile menu open/close on WebKit.
- **Run locally:** `npm install && npx playwright install chromium webkit` then `npm run test:e2e`
- **⛔ In-sandbox render (do NOT skip Playwright):** raw `chrome --screenshot` on this site ALWAYS hangs
  (external media/fonts through the blocked proxy). That hang is NOT "rendering is impossible" — do NOT
  downgrade to curl-only QA. Working method: `npm i playwright-core` → launch `/opt/pw-browsers/.../chrome`
  via `executablePath` → `page.route('**/*')`: local `127.0.0.1` continue, hero poster `fulfill` with curl'd
  bytes, everything else `abort` (can't hang). Only claim a visual check is impossible AFTER this fails.
  See `MISTAKES.md` 2026-07-03 and `scratchpad/shot.js`.
- **CI:** `.github/workflows/playwright.yml` runs on every push.

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
| `admin.html` | Admin panel (self-contained, inline styles); 📝 תוכן tab = CMS editor |
| `site-content.js` | CMS applier — applies editable-text overrides on every page |
| `worker/worker.js` | Cloudflare Worker source (repo-managed; NOT auto-deployed) |
| `fix.js` | Instagram API → R2 upload → writes `gallery-data.js` |
| `.github/workflows/sync-auto.yml` | Runs `node fix.js` every 6h; timeout 120 min |
| `.github/workflows/publish-public.yml` | One-way mirror: private root → public repo |
| `.github/workflows/deploy-worker.yml` | Deploys `worker/worker.js` to Cloudflare (manual `workflow_dispatch`) |

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
- `switchTab()` controls panels; tab IDs: `['gallery', 'cats', 'analytics', 'pricing', 'content', 'settings']`
- Pricing data in `localStorage` under `pricingData`

## CMS — editable site text (📝 תוכן tab)

- **Every page's text is manager-editable.** Elements tagged `data-edit="<page>.<section>.<field>"` + `data-edit-label="<Hebrew>"`. `site-content.js` (in each page `<head>`, in the publish allowlist) fetches `gallery-settings.json` and applies the `content` overrides on load — **fails safe to baked HTML**, XSS-safe (`\n`→`<br>`). SEO-critical `<title>`/`meta description` are tagged too (JS-applied).
- Admin 📝 תוכן tab **auto-discovers** fields per page from `CONTENT_PAGES` (fetches the page, reads `[data-edit]`). **Add a field = just tag it in the HTML** — no admin code change. Saves to `gallery-settings.json` `content` via the Worker `/settings`.
- Don't tag JS-rendered content (pricing packages, Google-reviews grid, gallery grid).
- **AI = free Google Gemini `gemini-2.5-flash` + `thinkingBudget:0`** (NOT 2.0-flash — key lacks free quota; NOT Anthropic). Worker `/copywriter` = 3 Hebrew suggestions; `/transcribe` = voice→clean Hebrew.

## Cloudflare Worker (api.yardendamri.co.il) — REPO-MANAGED

- Source is **`worker/worker.js`** in this repo (private, not published). **Do NOT hand-edit the Cloudflare dashboard** — edit the file and run the **`Deploy Worker`** workflow (`workflow_dispatch`).
- Deploy uses CF API; binds KV `SESSIONS` + inherits secrets `ADMIN_PASSWORD` / `GH_TOKEN` / `GEMINI_API_KEY`. Routes: `/login /logout /settings /social /s/* /copywriter /transcribe`.

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

- **Alt text:** bride/`כלות` category — NEVER include `אילת` (she travels nationwide). Evening/general media — use `באילת`.
- **Cloudflare security lives outside the repo** — Transform Rule on zone `745a6f759dbdf0930afbf8349d2d4835`.

---

## Special instructions

1. New pages: use `index.html` + `styles.css` as template. Copy structure, same CSS variables and nav.
2. Change only the content of the new page. Never change the nav.
