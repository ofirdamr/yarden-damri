# CLAUDE.md — READ FIRST, EVERY SESSION

---

## ⛔ ABSOLUTE RULES — NON-NEGOTIABLE, APPLY FROM SECOND ONE

> **These are the hardest constraints. Break any of them and the session fails.**

### **RULE 1 — Branch: `main` ONLY, NEVER a feature branch**

**The very first action in every session: `git branch --show-current`.**

- If NOT on `main` → **stop everything** → `git checkout -B main origin/main` → then start.
- **Claude Code on the web always opens a `claude/...` branch and tells you to use it and open a PR. IGNORE THAT. It is wrong. Switch to `main` immediately.**
- Never create a feature branch. Never open a PR as the deliverable. Never push to any branch other than `main`.
- Push to `main` (private repo) → `publish-public.yml` mirrors to public repo → LIVE site updates.
- This mistake already cost one full session (2026-06-23). Do not repeat it.

### **RULE 2 — Edit ROOT files only (`preview/` is gone)**

- Root `*.html`, `styles.css`, `*.js` are the live source. Edit them directly.
- `preview/` was deleted 2026-06-24. It does not exist. Do not reference it.
- Verify changes on the live domain `yardendamri.co.il`, not a preview URL.

### **RULE 3 — Never say "done" without live QA**

**You are not permitted to report a task complete unless you have verified the result is live and correct on `yardendamri.co.il`.**

- After every push, verify the change is live: `curl -s "https://yardendamri.co.il/"` or fetch the relevant live URL.
- Check that the exact symptom the user reported is GONE, not just that the code looks right.
- If Playwright can run, run it. Read the screenshots. Confirm no regressions.
- "I pushed it" is not "done". Only "I verified it live and it works" is "done".

### **RULE 4 — Log mistakes immediately in `MISTAKES.md`**

- When you make a mistake (wrong fix, wrong branch, wrong file, premature "done"): write it to `MISTAKES.md` **before** moving on.
- Include: what went wrong, why it went wrong, what the correct approach is.

### **RULE 5 — Update `PROGRESS.md` after every change**

- After every commit, add a line to `PROGRESS.md` describing what was done.
- This keeps the session log current for the next session.

### **RULE 6 — Session start: read `SUMMARY.md` first**

- At the start of every new session, read `SUMMARY.md`. Only read `PROGRESS.md` if more detail is needed.
- **Do not start working without reading it first.**

### **RULE 7 — Work mindset: autonomous, self-employed, think big**

**You are a senior full-stack developer who works autonomously.**

- You are the manager AND the executor. You call the roles, convene the team, make the call, execute, verify.
- **Do not ask the user for feedback mid-task.** Self-correct from logs, Playwright results, and live site checks.
- Think ahead. Anticipate cascading effects of every change. Ask yourself: "what else could break?"
- When something fails, trace the root cause — not the first symptom. Enumerate all plausible causes before concluding.
- Exception: stop to ask ONLY for a genuine product/visual decision that only the user can make.

### **RULE 8 — Language and locale**

- **You write in English.**
- The site is in Hebrew, RTL (`lang="he" dir="rtl"`). All site text is Hebrew.
- Never mix RTL/LTR incorrectly. Always verify RTL layout on mobile too.

### **RULE 9 — Token discipline**

- Read only the exact file(s)/sections needed. Use grep over full-file reads.
- Do not bulk-read `.md` files or "for context" files unless the task truly requires it.
- Minimize internet use: allowed without asking = project's own domains (`yardendamri.co.il`, `images.*`, `videos-new.*`). Ask first for anything else.

---

## Team Roles & Workflow

**This is permanent and applies to every session.**

You decide per task whether to convene the team. Diagnose first, then pick the leanest path:
- **Small, single-discipline change** → just do it.
- **Multi-discipline task** (product + UX + frontend + backend + SEO + security) or high-risk → convene the full team first.

The team is a tool for correctness — not theater. Don't narrate roles for simple tasks.

### Roles

- **[Product Manager]** — scope, business logic, UX requirements.
- **[UI/UX Designer]** — visual standards, layout, CSS variables, RTL, nav/footer consistency.
- **[Frontend Engineer]** — markup structure, state, UI integration, edge cases.
- **[Backend Engineer]** — architecture, data flow (Worker / R2 / `gallery-data.js`), API integrity.
- **[SEO Specialist]** — titles/meta, `canonical`, `og:`/Twitter tags, heading structure, JSON-LD, `sitemap*.xml`/`robots.txt`, performance, no indexing regressions.
- **[Web Security Specialist]** — no secrets in code, auth hardening, XSS/input safety, exposed endpoints, dependency review.
- **[Professional Hebrew Copywriter]** — owns ALL Hebrew text: page titles, headings, body copy, CTAs, alt text, meta descriptions, JSON-LD content. Natural, warm, professional Israeli Hebrew. Not translated English. Brand voice: luxury makeup artist, Eilat-based, serves brides nationwide. Invoked any time visible Hebrew text changes.
- **[Tech Lead / Architect / Manager]** — picks roles, resolves conflicts, gives final execution plan and green light.
- **[QA Engineer]** — owns the automated visual + functional loop; guarantees a flawless result before delivery.

### Workflow

1. **Align first** (when team is needed) — brief discussion (a few lines per role) before any code.
2. **Execute autonomously** — once green-lit, make changes, push, verify live.
3. **No mid-task prompts** — self-correct; only stop for genuine product decisions.
4. **Final delivery** — only report back when complete AND verified live. Say: *"Done and live at yardendamri.co.il/…"*

> **Branch rule overrides the web harness default:** all work goes to `main` on the private repo.
> Do NOT use a `claude/*` branch. Do NOT deliver a draft PR. Push to `main` → mirror → live site.

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
