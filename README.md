# Cloudgate App Templates

Pre-built starter apps for the Cloudgate Web Coder **Quick Start** gallery.

## Structure

```
templates.json          # Manifest consumed by the Cloudgate API
react/                  # React + Vite starter (port 3000)
angular/                # Angular standalone app with IdP login flow (port 3000)
html/                   # Plain static HTML site with IdP login flow (port 3000)
vue/                    # Vue 3 + Vite starter (port 5173)
podcast/                # Angular podcast app (port 3000) + workflow import template
```

Each template folder contains a `template.json` (same metadata as the root manifest entry) plus a minimal runnable project.

The **podcast** template also ships `.template/workflow-template.json` — import it in Cloudgate to create the `GET /podcasts` API the app uses at runtime. See [podcast/README.md](./podcast/README.md) for screenshots and setup details.

## Adding a template

1. Create a new top-level folder with the starter source.
2. Add a `template.json` inside the folder.
3. Add an entry to `templates.json` at the repo root (optional `thumbnail` URL for the Quick Start card image).
4. Push to `main` — the API caches the manifest (`WebApps:TemplatesCacheMinutes`: `1` in local dev, `720` / 12 hours in production). **Restart the Cloudgate API** or wait for the cache to expire, then click refresh on `/web-coder`.

## Cloudgate configuration

Point the API at this repo in `appsettings.json`:

```json
"WebApps": {
  "TemplatesRepo": "YOUR_GITHUB_USER/cloudgate-app-templates",
  "TemplatesBranch": "main",
  "TemplatesManifest": "templates.json"
}
```

## Dev preview

Starters are configured to listen on `0.0.0.0` and allow `.dev.cloudgate.dev` so they work in the Cloudgate editor preview URLs.
