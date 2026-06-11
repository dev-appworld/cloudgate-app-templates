# Podcast workflow import template

This folder ships the Cloudgate **project import** JSON for the podcast catalog API.

## Import in Cloudgate

1. Open **Imports** in the Cloudgate dashboard.
2. Upload or paste [workflow-template.json](./workflow-template.json).
3. Import into project path **`api`** (creates `GET /podcasts`, anonymous).
4. **Publish** the endpoint to sandbox.
5. Confirm: `GET {apps-gateway}/sbx/api/podcasts` returns catalog JSON.

The Angular app reads that URL via `workflowGatewayUrl`, `workflowEnvironment`, and `podcastCatalogRoute` in `src/assets/appconfig.json`.

## Regenerate after catalog changes

```bash
node .template/gen-workflow-template.mjs
```

Source data: [../.cloudgate/podcast-catalog.json](../.cloudgate/podcast-catalog.json).

MCP alternative: see [../.cloudgate/WORKFLOW_SETUP.md](../.cloudgate/WORKFLOW_SETUP.md).
