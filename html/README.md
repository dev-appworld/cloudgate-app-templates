# Cloudgate HTML

A plain static HTML/CSS/JS site with the **IdP user login flow**. Open `index.html` directly in your
browser, or serve it on port 3000 for the Cloudgate editor preview.

## Login flow

1. An unauthenticated visitor is redirected to the hosted IdP login page:
   `{baseUrl}/idp/{tenancy}/login`.
2. After authenticating, the IdP redirects back with
   `?access_token=...&refresh_token=...&expires_in=...`.
3. The app validates the token, stores it in `localStorage`, strips the params from the URL, and
   loads the profile from `/api/idp/{tenancy}/profile`.
4. The session is kept alive by proactive refresh before expiry and retry on 401, both calling
   `/api/idp/{tenancy}/Refresh`. Sign-out clears storage and returns to the login page.

## Configuration

Edit the `IDP_CONFIG` object at the top of `app.js`:

| Key            | Description                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `baseUrl`      | Base URL of the IdP (used to build the hosted login URL).                   |
| `apiUrl`       | Optional separate API base for profile/refresh. Falls back to `baseUrl`.    |
| `tenancyName`  | Tenancy name. Override at runtime with `?idp_tenant=`; otherwise this value wins, falling back to the subdomain when unset. |
| `returnUrl`    | Optional post-login redirect target. Defaults to this page's URL.          |

## Scripts

```bash
npm install
npm start          # dev preview at http://localhost:3000
npm run build      # copy static files to dist/
npm run preview    # build, then serve dist/ on port 3000
```

When using the preview URL, set `returnUrl` in `app.js` to match
(e.g. `http://localhost:3000` or your `.dev.cloudgate.dev` preview host).

The `dist/` folder is a production-ready copy of `index.html`, `styles.css`, and `app.js` — deploy
that folder to any static host.

## Files

```
index.html    # open this in your browser
styles.css    # styles
app.js        # config, auth, routing, and UI
package.json  # optional — preview, build, and serve scripts
scripts/
  build.js    # copies static files to dist/
```

Navigation uses hash routes (`#/`, `#/profile`) so links work when opening the file directly.
