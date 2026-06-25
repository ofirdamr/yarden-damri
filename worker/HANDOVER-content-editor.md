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

## ⏳ To turn on the 🤖 AI copywriter — YOU must do this
The AI button already works in the UI; it calls `POST https://api.yardendamri.co.il/copywriter`,
which returns **404 until you deploy the endpoint**. The admin handles that gracefully
("שירות הקופירייטר עדיין לא הופעל").

1. **Get an Anthropic API key** — console.anthropic.com → API Keys.
2. **Set it as a Worker secret** (never in the repo / frontend):
   ```
   wrangler secret put ANTHROPIC_API_KEY
   ```
3. **Add the endpoint** from `worker/copywriter-endpoint.js`:
   - Copy `handleCopywriter` (+ `corsHeaders`) into your Worker.
   - In your router, before the 404:
     ```js
     if (request.method === 'POST' && url.pathname === '/copywriter') return handleCopywriter(request, env);
     ```
   - **Replace the auth stub** (`env.SESSIONS.get(token)`) with the exact same Bearer/session
     check your `/settings` POST already uses — match your KV binding name and session shape.
4. **Deploy** the Worker. Done — the 🤖 button now returns 3 Hebrew suggestions per field.

- Model: `claude-sonnet-4-6` (good Hebrew, cheap). Swap to `claude-opus-4-8` for top quality.
- Cost: a few suggestions = fractions of a cent. Auth gates it to the logged-in admin only.

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
