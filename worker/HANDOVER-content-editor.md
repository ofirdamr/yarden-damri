# Content Editor — handover

What shipped (homepage pilot) and what's left for **you** to do (the AI half needs a Worker deploy + API key).

## ✅ Live after this push (no action needed)
- **Editable text on the homepage.** Every marketing text field in `index.html` is tagged
  `data-edit="home.<section>.<field>"` (75 fields incl. SEO title + meta description).
- **`site-content.js`** fetches `gallery-settings.json` → applies any saved overrides on load.
  Untouched fields keep the baked HTML (best SEO, zero flicker). Added to the publish allowlist.
- **Admin → 📝 תוכן tab.** Loads the live page, lists every field grouped by section, pre-filled.
  - Edit manually (textarea, RTL).
  - **🎤 voice dictation** — Web Speech API, Hebrew (`he-IL`). Works in Chrome on desktop; needs
    mic permission. No backend, no cost.
  - **↺ reset** a field to its original text.
  - **💾 שמור שינויים** → saves via the existing Worker `/settings` (stored under `content`).
- Storage reuses the existing pipeline — **no Worker change needed for editing/voice/saving.**

## ⏳ To turn on the 🤖 AI copywriter — YOU must do this (FREE, Google Gemini)
The AI button already works in the UI; it calls `POST https://api.yardendamri.co.il/copywriter`,
which returns **404 until you deploy the endpoint**. The admin handles that gracefully
("שירות הקופירייטר עדיין לא הופעל").

1. **Get a FREE Gemini API key** — https://aistudio.google.com/apikey → sign in with Google →
   **Create API key**. No credit card. Copy it (starts with `AIza...`).
2. **Set it as a Worker secret** (never in the repo / frontend):
   - Dashboard: Worker → **Settings → Variables and Secrets → Add** → type **Secret**,
     name `GEMINI_API_KEY`, paste the key, **Deploy**.
   - or CLI: `wrangler secret put GEMINI_API_KEY`
3. **Paste the ROUTE BLOCK** from `worker/copywriter-endpoint.js` into `worker-temp.js`,
   inside the `try {…}`, immediately **before** the line
   `return json({ error: 'not_found' }, 404, {}, origin);`.
   (It reuses the Worker's existing `validateSession()`, `json()`, and `origin` — no other
   changes; OPTIONS/CORS are already handled globally.)
4. **Deploy** the Worker. Done — the 🤖 button now returns 3 Hebrew suggestions per field.

- **Cost: free.** Gemini's free tier (model `gemini-2.5-flash`) covers a manager clicking now and then.
- Free-tier limits = a few requests/minute (plenty here). Note: Google may use free-tier inputs to
  improve their models — fine for marketing copy. Auth gates the endpoint to the logged-in admin only.
- Your Anthropic Claude key is NOT used and NOT needed.

## Expanding to other pages (later)
Tag any other page's text with `data-edit="<page>.<section>.<field>"` + `data-edit-label="…"`,
add `<script src="site-content.js?v=1"></script>` in its `<head>`, and add the page to
`CONTENT_PAGES` in `admin.html`. The editor auto-discovers the fields — no per-field admin code.

## Notes / tradeoffs
- Values are stored as **plain text** (`\n` = line break), rendered XSS-safe. Fields that had
  inline `<strong>`/`<em>` (cta strip, philosophy quote) lose that styling **only if edited**;
  untouched, they keep the baked markup.
- SEO title/description are JS-applied (the chosen JSON-overrides model). Google renders JS, but
  if you ever want them 100% static, that's the "bake into HTML" option we deferred.
