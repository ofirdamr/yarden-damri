/* copywriter-endpoint.js — DROP-IN for the Cloudflare Worker (api.yardendamri.co.il)
 * ────────────────────────────────────────────────────────────────────────────
 * Adds  POST /copywriter  — the admin "🤖 ייעוץ קופירייטר" feature.
 * Uses GOOGLE GEMINI (free tier — Google AI Studio). Takes the current text of a
 * section + a style prompt, returns { ok:true, suggestions:[ "...", "...", "..." ] }.
 *
 * INTEGRATION (do these 3 things in your existing Worker):
 *   1. Get a FREE Gemini key at  https://aistudio.google.com/apikey  (no credit card).
 *      Set it as a Worker secret:   wrangler secret put GEMINI_API_KEY
 *      (or Cloudflare dashboard → Worker → Settings → Variables and Secrets → add
 *       a SECRET named GEMINI_API_KEY). The key NEVER goes in the repo or frontend.
 *   2. In your fetch() router, before the 404, add:
 *        if (request.method === 'POST' && url.pathname === '/copywriter') {
 *          return handleCopywriter(request, env);
 *        }
 *   3. Reuse YOUR existing auth: replace `env.SESSIONS.get(token)` below with the same
 *      SESSIONS-KV Bearer-token check the /settings POST route already uses.
 *
 * CORS: returns the same CORS headers your other endpoints use. If you have a shared
 * corsHeaders(request) helper, swap CORS below for it.
 */

// Free-tier Gemini model. Swap if you like (e.g. 'gemini-2.0-flash').
const GEMINI_MODEL = 'gemini-2.5-flash';

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || 'https://yardendamri.co.il';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function handleCopywriter(request, env) {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // ── AUTH — REPLACE with your existing SESSIONS-KV token check ──────────────
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const session = token ? await env.SESSIONS.get(token) : null; // adjust to your KV binding/shape
  if (!session) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const label   = String(body.label   || 'טקסט באתר').slice(0, 200);
  const current = String(body.current || '').slice(0, 4000);
  const prompt  = String(body.prompt  || '').slice(0, 1000);

  const system =
    'את קופירייטרית מקצועית שכותבת בעברית טבעית, חמה ומדויקת עבור מותג יוקרה של מאפרת כלות וערב. ' +
    'המאפרת ממוקמת באילת ומגיעה לכלות בכל רחבי הארץ. הטון: נשי, אלגנטי, אישי ומזמין — לא מתורגם, לא מליצי מדי, ' +
    'נטול קלישאות שיווקיות זולות. כתבי בעברית תקנית. שמרי על אורך דומה לטקסט המקורי ועל אותו תפקיד ' +
    '(כותרת קצרה / תת-כותרת / פסקה / כפתור). אל תוסיפי מרכאות, כוכביות או סימוני עיצוב. ' +
    'החזירי אך ורק JSON תקין בפורמט: {"suggestions":["נוסח 1","נוסח 2","נוסח 3"]}.';

  const userMsg =
    'שדה: ' + label + '\n' +
    'הטקסט הנוכחי:\n"""' + (current || '(ריק)') + '"""\n\n' +
    (prompt ? ('בקשת הסגנון של המנהלת: ' + prompt + '\n\n') : '') +
    'הציעי 3 ניסוחים חלופיים מצוינים לשדה הזה.';

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);

  let aiRes;
  try {
    aiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 1024, responseMimeType: 'application/json' },
      }),
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'upstream_network' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  if (!aiRes.ok) {
    const detail = await aiRes.text().catch(() => '');
    return new Response(JSON.stringify({ ok: false, error: 'upstream_' + aiRes.status, detail: detail.slice(0, 300) }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const data = await aiRes.json();
  const text = (((data.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '';

  // Parse the JSON the model returned; fall back to line-splitting if needed.
  let suggestions = [];
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) suggestions = JSON.parse(m[0]).suggestions || [];
  } catch {}
  if (!suggestions.length) {
    suggestions = text.split(/\n{2,}/).map(s => s.replace(/^["'\d.\-)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
  }

  return new Response(JSON.stringify({ ok: true, suggestions }),
    { headers: { ...cors, 'Content-Type': 'application/json' } });
}

// Exported for convenience / testing — call handleCopywriter from your existing router.
export { handleCopywriter, corsHeaders };
