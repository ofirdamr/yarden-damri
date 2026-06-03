# SUMMARY

## What is done
1. **Hero video flash — fixed for ALL visitors**
   - Root cause: default video was hardcoded in HTML; async fetch swapped it after ~1s
   - Previous (wrong) fix: read localStorage — only worked for device owner
   - Real fix: chosen video URL is now baked into `preview/index.html` directly
   - Worker (`preview/worker.js`) → when admin saves `heroVideo`, it auto-patches `preview/index.html` in GitHub (replaces `<source src>` and `poster`) so every new visitor gets the right video from the first byte
   - Current baked video: `yarden_makeup_18352618189204100`

## What still needs to be done
- **Render.com** — getting failed deploy emails. Likely the old webhook server. Need Render dashboard access or logs to investigate.
- TikTok footer icon still slightly smaller than Instagram visually (deferred from last session).
