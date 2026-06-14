---
name: Vite 6 middleware host check
description: Vite 6.4+ returns 426 "Upgrade Required" for external hosts even in middleware mode; fix is to rewrite the Host header before Vite's middleware.
---

## Rule
When using `createViteServer` in Express middleware mode on Replit, Vite 6.4+ will return HTTP 426 "Upgrade Required" for requests coming from external domains (e.g. `.janeway.replit.dev`). Setting `allowedHosts: true` in the `createViteServer` call alone is NOT sufficient.

**Fix:** Add an Express middleware that rewrites the `Host` header to `localhost:PORT` before `app.use(vite.middlewares)`:

```typescript
app.use((req, _res, next) => {
  req.headers.host = "localhost:5000";
  next();
});
app.use(vite.middlewares);
```

**Why:** Vite 6.4 introduced a strict DNS-rebinding protection that checks the incoming `Host` header. In middleware mode the `allowedHosts` option in the Vite config or `createViteServer` options doesn't reliably suppress the check. Rewriting to `localhost` always satisfies Vite's security check.

**How to apply:** Any time Vite is used via `createViteServer` + Express middleware behind a reverse proxy (Replit, nginx, etc.) and external browsers get a black-screen or 426 error.
