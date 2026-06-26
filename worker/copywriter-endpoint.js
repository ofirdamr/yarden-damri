/* copywriter-endpoint.js — the /copywriter route for worker-temp.js (api.yardendamri.co.il)
 * ────────────────────────────────────────────────────────────────────────────
 * Tailored to the deployed Worker: modules syntax, reuses validateSession()/json()/origin.
 * Uses GOOGLE GEMINI (free tier). Returns { ok:true, suggestions:[...] } — the shape the
 * admin "🤖 ייעוץ קופירייטר" button expects.
 *
 * INSTALL (2 things):
 *   1. Secret:  add  GEMINI_API_KEY  (free key from https://aistudio.google.com/apikey).
 *   2. Paste the ROUTE BLOCK below into worker-temp.js, INSIDE the try{...}, immediately
 *      BEFORE the line:   return json({ error: 'not_found' }, 404, {}, origin);
 *   Then Deploy. (OPTIONS/CORS are already handled globally — nothing else needed.)
 */

// ===== ROUTE BLOCK — paste before the 404 line in worker-temp.js =====

      // ── POST /copywriter — AI copy suggestions (Gemini, requires session token) ──
      if (request.method === 'POST' && path === '/copywriter') {
        const valid = await validateSession(request, env);
        if (!valid) return json({ error: 'unauthorized' }, 401, {}, origin);
        if (!env.GEMINI_API_KEY) return json({ error: 'ai_not_configured' }, 503, {}, origin);

        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_body' }, 400, {}, origin); }
        const label   = String((body && body.label)   || 'טקסט באתר').slice(0, 200);
        const current = String((body && body.current) || '').slice(0, 4000);
        const prompt  = String((body && body.prompt)  || '').slice(0, 1000);

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

        const gURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
        const gRes = await fetch(gURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
            // thinkingBudget:0 disables 2.5-flash "thinking" → no truncated/cut-off JSON.
            generationConfig: { temperature: 0.9, maxOutputTokens: 2048, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
          }),
        });
        if (!gRes.ok) {
          const detail = await gRes.text().catch(() => '');
          return json({ error: 'upstream_' + gRes.status, detail: detail.slice(0, 200) }, 502, {}, origin);
        }
        const gData = await gRes.json();
        const text = (((gData.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || '';
        let suggestions = [];
        try { const m = text.match(/\{[\s\S]*\}/); if (m) suggestions = JSON.parse(m[0]).suggestions || []; } catch {}
        if (!suggestions.length) {
          suggestions = text.split(/\n{2,}/).map(s => s.replace(/^["'\d.\-)\s]+/, '').trim()).filter(Boolean).slice(0, 3);
        }
        return json({ ok: true, suggestions }, 200, {}, origin);
      }

// ===== END ROUTE BLOCK =====
