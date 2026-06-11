# Cloudgate App Templates

Pre-built starter apps for the Cloudgate Web Coder **Quick Start** gallery.

## Structure

```
templates.json          # Manifest consumed by the Cloudgate API
react/                  # React + Vite starter (port 3000)
angular/                # Angular standalone app with IdP login flow (port 3000)
html/                   # Plain static HTML site with IdP login flow (port 3000)
```

Each template folder contains a `template.json` (same metadata as the root manifest entry) plus a minimal runnable project.

## Adding a template

1. Create a new top-level folder with the starter source.
2. Add a `template.json` inside the folder.
3. Add an entry to `templates.json` at the repo root.
4. Push to `main` — the API caches the manifest for ~10 minutes.

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
