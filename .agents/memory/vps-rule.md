---
name: VPS Access Rule
description: Never SSH into or modify the VPS unless the user explicitly says so in that message.
---

The user has explicitly stated: DO NOT touch the VPS unless they say so.

**Why:** The user manages VPS deployments themselves and does not want the agent making unsolicited changes to production.

**How to apply:** Any task involving the VPS (SSH, scp, pm2, .env changes, builds, restarts) must be explicitly requested by the user in that conversation turn. Never proactively deploy, restart, or modify anything on the VPS.
