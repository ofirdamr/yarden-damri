# SUMMARY

## What is done
1. **Hero video flash — fixed for ALL visitors**
   - Chosen video URL baked directly into `preview/index.html` (`<source src>` + `poster`)
   - Worker (`preview/worker.js`) auto-patches `index.html` in GitHub whenever admin saves a new heroVideo
   - Every visitor worldwide sees the correct video from first byte — no JS, no async, no flash

2. **Render.com — deleted**
   - Was crashing on every deploy: `Cannot find module 'webhook-server.js'` (file removed long ago)
   - Served no purpose — Cloudflare Worker replaced it
   - Deleted by Ofir → no more failed deploy emails

## What still needs to be done
- TikTok footer icon still slightly smaller than Instagram visually (deferred)
- Any new tasks
