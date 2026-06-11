# Podcast workflow bundle

[workflow-template.json](./workflow-template.json) is the Cloudgate import payload for the podcast catalog API.

When you create this template from **Quick Start**, Cloudgate copies the app into your workspace and imports the bundled workflow(s) automatically (you can deselect them in the dialog).

After create:

1. **Publish** the **Podcast Catalog** endpoint to sandbox.
2. Confirm: `GET {apps-gateway}/sbx/api/podcasts` returns catalog JSON.

The Angular app reads that URL via `workflowGatewayUrl`, `workflowEnvironment`, and `podcastCatalogRoute` in `src/assets/appconfig.json`.

To change catalog data, edit the Function node script in `workflow-template.json`, then re-import via Cloudgate Imports if needed.
