
## שגיאה — שינוי פונט בלי אישור (יוני 2026)
- **מה קרה:** החלפתי את פונט "ירדן דמרי" בנאב ל-Cormorant Garamond ו-Heebo בלי לבדוק מה היה המקור.
- **מה היה צריך:** לבדוק ב-styles.css המקורי לפני שינוי פונט — הפונט המקורי הוא Rubik (weight 400 לשם, weight 300 לתת-כותרת).
- **לקח:** לפני כל שינוי טיפוגרפי — תמיד לבדוק את ה-CSS המקורי ואת git history.

## MAJOR FAILURE — WhatsApp floating button alignment (June 2026)
**Session:** Homepage copywriting + floating buttons redesign

### What went wrong:
1. Changed `<a>` to `<button>` for WA button mid-session without solving root cause first.
2. Used CSS `!important` overrides repeatedly instead of fixing the underlying rule conflict.
3. Accepted Gemini-generated CSS targeting fake selectors (`#whatsapp-widget-container`, `[class*="elfsight-app"]`) that don't exist in the codebase — wasted multiple iterations.
4. Had mixed `bottom` values (24px / 28px / 30px / 32px) across scoped and global CSS rules — never audited all occurrences before applying a fix.
5. Left dead `.wa-float` rules in `styles.css` for many commits while working on `#wa-float-btn` — caused confusion about which rule was active.
6. Wrote in Hebrew multiple times despite explicit project instructions requiring English only.

### Root lesson:
Before touching floating button CSS: grep ALL occurrences of the selector across the entire file, confirm one source of truth, then make one clean change. Never add !important to fight another !important.
