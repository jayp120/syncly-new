# Platform Admin Production Runbook

Audience: platform admin / SRE. Purpose: keep the platform-admin path healthy and safe in production.

## Identity and claims
- Firestore profile: user doc for `superadmin@syncly.com` must have `isPlatformAdmin: true` (see `users` collection).
- Auth custom claim: Firebase Auth token must include `isPlatformAdmin: true`. If you set claims, sign out/in to refresh tokens.
- Drift fixer (one-time): `emergencyFixPlatformAdmin` in `functions/src/index.ts` sets the claim for `superadmin@syncly.com`. Call it with the secret, verify claims, then disable/remove the endpoint immediately.

## Access and permissions
- App routing: platform admin should land on `/super-admin` (see `App.tsx`), no tenant context needed.
- Permission guard: `hasPermission` in `components/Auth/AuthContext.tsx` returns `true` for `isPlatformAdmin` users. If you see permission errors, recheck claims and profile flags.
- Functions: tenant operations (`createTenant`, plan/status updates, `resetTenantAdminPassword`, claim fixers, admin deletes) all require `isPlatformAdmin` via Firestore flag or custom claim.

## Critical flows to verify (smoke test)
1) Login as platform admin, ensure dashboard loads and tenants list renders (no “Missing or insufficient permissions”).
2) Update a tenant plan/status, confirm toast and Firestore update.
3) Reset a tenant admin password via Super Admin settings → should succeed (function: `resetTenantAdminPassword`).
4) Tenant admin can log in with the new password; tenant users still isolated.
5) Log out/in to confirm fresh token still grants platform-admin access.

## Security hygiene
- MFA: enable MFA on `superadmin@syncly.com`; store recovery codes securely.
- Secrets: rotate and lock down Firebase API keys, service accounts, and function env vars; avoid leaving secrets in client env.
- Surface area: remove/disable emergency endpoints after use; keep `emergencyFixPlatformAdmin` inactive in production.
- Logging: avoid logging tokens/passwords; keep debug logs minimal in platform-admin paths.

## Monitoring and triage
- Enable “Preserve log” in browser devtools and capture the first error message before stack noise.
- Check Firebase Functions logs for permission denials and claim mismatch warnings.
- Watch Firestore rules logs for rejected reads/writes on `tenants`/`users` when platform admin is active.

## Deploy and rollback checklist
- Before deploy: deploy functions, then run the smoke test above. Verify `resetTenantAdminPassword` works end-to-end.
- If claims drift post-deploy: reapply custom claim to platform admin, force token refresh (sign out/in). Use emergency fixer only if necessary, then disable it.
- Keep a rollback plan for functions (previous release) if new auth/claim logic breaks access.
