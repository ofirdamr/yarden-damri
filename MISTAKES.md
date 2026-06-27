# Mistakes Log

> Older entries archived to MISTAKES-archive.md (not auto-read).

## 2026-06-23 — Claimed services 2×2 "verified" but missed the secondary grid
I screenshotted only the main 4 service cards (confirmed 2×2) and declared #3 fixed, but the page has a SECOND grid below ("secondary services", 2 cards) that was still `repeat(auto-fill,minmax(280px,1fr))` → rendered as 3 columns with 2 narrow misaligned cards. The user saw it as "still not arranged." Root lesson: verify the WHOLE page/section, not just the element I changed — and force scroll-reveal (`.reveal`) visible when screenshotting or lower content reads as blank. Fix: gave the secondary grid `class="services-grid"` so it inherits the same responsive 2-col layout and aligns under the 2×2.

## 2026-06-23 — Go-live cleanup deleted files still referenced by the sync workflow
Deleting preview/index-temp.html + preview/gallery-temp.html (Stage A) broke sync-auto.yml, which still did `git add` on them → exit 128 every run → gallery data stopped updating. Lesson: when deleting files, grep the whole repo (workflows included) for references before/after — a deletion isn't done until nothing still points at the file. Hard-coded file lists in CI are brittle; prefer existence-guarded staging.

## 2026-06-26 (session 5) — /copywriter 500: used `key` without reading it from the body
Added the SEO-aware branch referencing `key`/`page`, but the handler never did `const key = body.key`.
ReferenceError → outer catch → 500. **Lesson:** when new code references a request field, confirm the
field is actually destructured from the body. The admin's surfaced error detail is what pinned it fast.

## 2026-06-26 (session 5) — broke services FAQ <h2> by inserting attribute into text, not the tag
Node string-replace matched `שאלות נפוצות</h2>` and prepended ` data-edit=...>`, landing the attribute
AFTER the tag's `>` (visible as text). **Lesson:** when adding an attribute via string replace, anchor on
the tag's own `>`; after bulk tagging, grep for `> data-edit=` to catch leaks (I did, and caught it).

## 2026-06-26 (session 5) — responsive nav threshold guessed too low (1400px), still overlapped at 1440
Estimated the collision width instead of measuring; name still overlapped at 1440. Re-measured with
Playwright (overlap gone by 1500) and set 1500px. **Lesson:** measure responsive breakpoints in a real
browser before committing; don't estimate pixel math.

## 2026-06-26 (session 5) — asserted "mobile can't autoplay many videos" as the cause — WRONG
The site already autoplays 5–7 grid videos fine for a month; the user's issue was battery saver. I stated a
platform "limit" as fact without evidence. **Lesson:** the site's own working behavior is ground truth;
don't explain away a report with assumed platform limits — verify first.

## 2026-06-26 (session 5) — did NOT log mistakes to MISTAKES.md during the session
Only caught when the owner asked if the MD files were updated. **Lesson:** log to MISTAKES.md immediately
per the routine, not at session end.
