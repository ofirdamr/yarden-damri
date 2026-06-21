# HANDOFF — Fix the lightbox button layout (gallery + homepage)

**Read this first. This is the one open task.**

## Context
The lightbox (open a photo/video in the gallery) now opens **fullscreen** and the
site nav is hidden while it's open. That part is fine. The problem is **buttons
overlapping other buttons** — it looks bad and some controls can't be used.

## What is wrong (see screenshot IMG_2890 the user sent)
On a **video** in the lightbox there are TWO sets of controls fighting:
1. **Our custom buttons**: close **X** (top-left), prev/next arrows (mid sides),
   and the bottom **action bar** (like / comment / share / save).
2. **The browser's NATIVE video controls** (because `<video controls>`):
   top-left = mute/speaker, top-right = PiP + fullscreen, bottom = scrubber /
   progress line, center = play + 10s skip.

Overlaps the user explicitly called out:
- Our close **X** sits **on top of** the native mute/speaker control (both top-left).
- The bottom **action bar** (like/comment/share) sits **on top of** the video's
  native scrubber/progress line.
- A **cookie banner** (48px tall, `z-index:10001`, `body.has-ck`) also sits at the
  very top over the lightbox.

## Goal (user's words)
"Make it look good — no button on top of another button; every button can be used
and seen." Every control (our X, prev/next, like/comment/share/save, AND the
video's native controls) must be visible and not overlapping.

## Suggested directions (decide WITH the user, don't guess for days)
- Likely cleanest: **drop the native `controls`** on the lightbox `<video>` and
  rely only on our own buttons + a simple custom play/seek — then there is only
  ONE set of controls, no overlap. OR
- Keep native controls but **move our chrome out of their way**: close X to a
  corner the native UI doesn't use, and lift the action bar above the scrubber.
- Whatever the choice: the cookie banner must not cover any control either.

## Where the code is
- `preview/gallery.html` — `.lb`, `.lb-img`, `.lb-video`, `.lb-close`, `.lb-prev/next`,
  `.lb-actions`, `.lb-counter` CSS ~lines 85–115; lightbox markup ~lines 310–335.
- `preview/index.html` (homepage) — `#lightbox` inline styles in `<head>`; the
  video element is built in JS via `vid.style.cssText` (~line 865); `.lb-actions`,
  `.lb-close-btn`, `body.has-ck #lightbox video` rules in the head `<style>`.

## Rules (do not skip)
- Work on `main`, edit only `*-temp.html`, get the user's review at the
  `/preview/*-temp.html` URL, then promote to permanent ONLY on explicit approval.
- One change at a time, confirm with the user before stacking the next.
- Read MISTAKES.md before touching video/lightbox code — there is a long history.
- Do NOT over-read files; ask before reading many.
