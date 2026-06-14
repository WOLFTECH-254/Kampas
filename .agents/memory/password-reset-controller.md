---
name: Password reset controller split
description: The forgotPassword and resetPassword handlers are in verification.controller.ts, not auth.controller.ts — auth.routes.ts imports from verification.controller.ts
---

The auth routes (`backend/src/routes/auth.routes.ts`) import `forgotPassword` and `resetPassword` from `verification.controller.ts`, NOT from `auth.controller.ts`. Editing `auth.controller.ts` for these endpoints has no effect.

**Why:** An earlier session created a separate `verification.controller.ts` for OTP-based verification flows and added forgot/reset password there. The routes were wired to that file.

**How to apply:** Any changes to forgot-password or reset-password logic must go in `backend/src/controllers/verification.controller.ts`. The `resetPassword` handler expects `{ userId, code, newPassword }` (matching `ResetPassword.tsx`). The `forgotPassword` handler builds the reset URL using `process.env.APP_URL` from `backend/.env`.
