# Podcast Catalog Workflow Setup

Create the `GET /api/podcasts` workflow so the podcast app can load catalog JSON at runtime.

## Option A — Quick Start (recommended)

1. In Web Coder, open **Quick Start** and use the **Cloudgate Podcast** template.
2. Keep **Podcast Catalog** selected in the workflow import list (default).
3. Click **Create & open editor** — the app and workflow import run together.
4. Publish **Podcast Catalog** to sandbox.
5. Test: `GET http://apps.localhost:44301/sbx/api/podcasts`

See [../.template/README.md](../.template/README.md).

## Option B — Manual import

1. In Cloudgate, open **Imports**.
2. Upload [../.template/workflow-template.json](../.template/workflow-template.json).
3. Import into project path **`api`**, publish sandbox, and test as above.

## Option C — Cloudgate MCP

### Prerequisites

- Cloudgate hub running (e.g. `http://localhost:5174`)
- Workflow gateway reachable (e.g. `http://apps.localhost:44301`)
- Cloudgate MCP connected in your editor

### Data source

Catalog JSON lives at [podcast-catalog.json](./podcast-catalog.json). The workflow Function node returns this payload.

### MCP steps

1. **List projects** — find `project_id` for project path `api`:
   ```
   list_projects
   ```

2. **Validate workflow JSON** — use [podcast-catalog-workflow.json](./podcast-catalog-workflow.json):
   ```
   validate_workflow_json(endpoint_json: <contents of podcast-catalog-workflow.json>)
   ```

3. **Create endpoint** (dry-run first):
   ```
   create_endpoint(endpoint_json: <contents>, dry_run: true)
   create_endpoint(endpoint_json: <contents>, dry_run: false)
   ```

4. **Test sandbox**:
   ```powershell
   Invoke-WebRequest -Uri "http://apps.localhost:44301/sbx/api/podcasts" -UseBasicParsing
   ```

5. **Publish to production** (when ready):
   ```
   PublishEndpoint(endpoint_id: <new id>, dry_run: true)
   PublishEndpoint(endpoint_id: <new id>, confirm_apply: true, dry_run: false)
   ```

## App configuration

After the workflow is live, `src/assets/appconfig.json` should include:

```json
{
  "workflowGatewayUrl": "http://apps.localhost:44301",
  "workflowEnvironment": "sbx",
  "workflowProjectPath": "api",
  "podcastCatalogRoute": "podcasts"
}
```

Switch `workflowEnvironment` to `prod` when using the published endpoint.

## Function script pattern

The Function node returns catalog JSON as a plain string (same pattern as Hello World):

```python
return '{"featured":[...],"trending":[...],"categories":[...],"playlists":[...]}'
```

Regenerate from `podcast-catalog.json` — do not use base64 or `json.loads` in the workflow UI.

## Tenant mapping

`apps.localhost` resolves to **tenant 20**. Use MCP with `TenantId: 20` when updating the live endpoint:

| Field | Value |
|-------|-------|
| Endpoint ID | `a40c9c3a-6ba8-4ed5-9256-18660da781da` |
| Project ID | `af89639b-f5c7-4d4b-4ce8-08dec7a2e3e4` |

## Updating catalog data

1. Edit `podcast-catalog.json`
2. Update the Function node in `../.template/workflow-template.json` (or regenerate MCP payload: `node .cloudgate/gen-podcast-workflow.mjs`)
3. Re-import or `update_endpoint` via MCP, then `publish_endpoint`
4. Re-test `GET /sbx/api/podcasts`
