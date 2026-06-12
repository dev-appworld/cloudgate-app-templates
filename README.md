# Cloudgate App Templates

Official starter apps for the [Cloudgate](https://cloudgate.dev) **Web Coder** Quick Start gallery.

Browse templates in the hub at **Web Coder → Quick Start** (`/web-coder`). Each card shows a preview image, framework, description, and a link to the template source on GitHub. Choose **Use this template** to copy the project into your Cloudgate workspace and open it in the editor.

## Templates

| Template | Folder | Notes |
| --- | --- | --- |
| Cloudgate Podcast Demo | [`podcast/`](./podcast/) | Angular podcast demo app with bundled workflow import for `GET /podcasts` |

Additional starters (`react/`, `angular/`, `html/`, `vue/`) live in this repo and can be enabled in [`templates.json`](./templates.json) when listed in the manifest.

### Cloudgate Podcast Demo

The Cloudgate Podcast Demo template includes a workflow catalog the app calls at runtime. When you create the project from Quick Start, selected workflows import automatically. See [podcast/README.md](./podcast/README.md) for screenshots, demo link, and full setup.

## Repository layout

```
templates.json          # Manifest published to the Quick Start gallery
react/
angular/
html/
vue/
podcast/                # Featured template — Angular + workflow import
```

Each template folder contains a runnable project and a `template.json` with the same metadata as its manifest entry.

## Manifest fields

Entries in `templates.json` drive the Quick Start cards:

| Field | Purpose |
| --- | --- |
| `id` | Unique template identifier |
| `name` | Card title |
| `description` | Short summary on the card |
| `folder` | Repo subfolder copied into the user's workspace |
| `framework` | Badge label (e.g. Angular, React) |
| `devCommand` | Suggested start command shown in the use-template dialog |
| `devPort` | Dev server port (informational) |
| `thumbnail` | Preview image URL on the card |
| `demoUrl` | Live hosted demo link shown on the card (optional) |
| `tags` | Search/filter tags in Quick Start |

## Adding a template

1. Add a new top-level folder with the starter source.
2. Add `template.json` inside the folder.
3. Register the template in `templates.json` (include a `thumbnail` URL for the card image).
4. Push to `main` — new and updated templates appear in Quick Start after the gallery refreshes.

## License

Template projects include their own licenses where applicable. See each folder for details.
