---
name: TSX cache stale code issue
description: The backend workflow can serve stale compiled code from tsx's /tmp cache even after file edits and restarts
---

tsx caches compiled TypeScript in `/tmp/{pid}-{hash}` files. When a workflow restart doesn't fully kill the old process (stuck on port 8000), the new process fails silently and the old cached code continues serving.

**Why:** The `restart_workflow` tool sends SIGTERM but occasionally the process doesn't die cleanly, leaving a zombie on port 8000. New restarts fail with EADDRINUSE.

**How to apply:**
1. Workflow command uses `--no-cache` flag: `npx tsx --no-cache src/index.ts`
2. If stale code is still served, kill with: `fuser -k 8000/tcp 2>/dev/null || pkill -f "tsx.*index.ts"`
3. Clear all tsx cache: `find /tmp -maxdepth 1 -name '[0-9]*-[0-9a-f]*' -delete`
4. Confirm fresh code is running by checking the response message string matches what's in the source file
