# Podcast workflow bundle

[workflow-template.json](./workflow-template.json) is the Cloudgate import payload for the podcast catalog API.

When you create this template from **Quick Start**, Cloudgate copies the app into your workspace, patches `src/assets/appconfig.json` and `appconfig.production.json` with your tenant and dev-preview URLs, and imports the bundled workflow(s) automatically (you can deselect them in the dialog).

[appsettings.json](./appsettings.json) is a reference copy of the runtime keys Cloudgate sets (with `{{placeholders}}`); the app does not read it.

After create:

1. **Publish** the **Podcast Catalog** endpoint to sandbox.
2. Confirm: `GET {apps-gateway}/sbx/api/podcasts` returns catalog JSON.

The Angular app calls `{workflowGatewayUrl}/{environment}/api/podcasts` (`workflowGatewayUrl` is tenant-specific; `environment` is `sbx` or `prod` in `src/assets/appconfig.json`).

To change catalog data, edit the Function node script in `workflow-template.json`, then re-import via Cloudgate Imports if needed.
