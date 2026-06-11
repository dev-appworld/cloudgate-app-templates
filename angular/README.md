# Cloudgate Angular

A minimal Angular standalone app that supports the **IdP user login flow** only, with a placeholder
Home page and a Profile page after login. It is a stripped-down port of the IdP auth pieces from
`Cloudweb Apps` (no ABP/admin login, signup, 2FA, reset-password, Google, or reCAPTCHA).

## Login flow

1. An unauthenticated visitor hitting any route is redirected by `authGuard` to the hosted IdP
   login page: `{idpBaseUrl}/idp/{tenancy}/login`.
2. After authenticating, the IdP redirects back to the app with
   `?access_token=...&refresh_token=...&expires_in=...`.
3. `AuthService` validates the token, stores it in `localStorage`, strips the params from the URL,
   and loads the profile from `/api/idp/{tenancy}/profile`.
4. The session is kept alive by a proactive refresh before expiry and a 401 interceptor, both
   calling `/api/idp/{tenancy}/Refresh`. Sign-out clears storage and returns to the login page.

## Configuration

Edit `src/environments/environment.ts`:

| Key               | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `idpBaseUrl`      | Base URL of the IdP (used to build the hosted login URL).                   |
| `idpApiUrl`       | Optional separate API base for profile/refresh. Falls back to `idpBaseUrl`. |
| `idpTenancyName`  | Tenancy name. Override at runtime with `?idp_tenant=`; otherwise this value wins, falling back to the subdomain when unset. |
| `idpReturnUrl`    | Optional post-login redirect target. Defaults to this app's origin.       |

See `src/environments/environment.example.ts` for a commented reference.

## Scripts

```bash
npm install
npm start        # dev server at http://localhost:3000
npm run build    # production build to dist/
```

## Structure

```
src/app/auth/
  idp-auth.config.ts      # env + tenancy resolution, login URL
  idp-profile.service.ts  # profile get/update + token refresh
  jwt.utils.ts            # token validation / decode helpers
  auth-storage.ts         # token storage keys
  auth.service.ts         # bootstrap, refresh, logout, profile state
  auth.guard.ts           # route guard -> redirects to IdP login
  auth.interceptor.ts     # bearer token + 401 retry
src/app/components/
  layout.component.ts     # header with user menu + sign out
  screen-loader.component.ts
src/app/pages/
  home.component.ts       # placeholder home
  profile.component.ts    # view/edit name, surname, email
```
