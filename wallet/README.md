# Cloudgate Wallet Demo

Angular wallet demo for the [Cloudgate](https://cloudgate.dev) **Web Coder** gallery. View balances and transfer funds; catalog data comes from a Cloudgate workflow (`GET /transactions`).

**Public demo:** [https://wallet-demo.cloudweb.dev/](https://wallet-demo.cloudweb.dev/)

## Screenshots

<p align="center">
  <img src="./banner.png" width="360" alt="Wallet demo preview" />
</p>

Mobile UI in light and dark mode. See the [live demo](https://wallet-demo.cloudweb.dev/) for the full experience.

## Local development

```bash
npm install
npm run start:local
```

Runs on **port 3000** with IdP and workflow proxying via `proxy.conf.json`.

## Workflow import

Import `.template/workflow-template.json`, publish the **Wallet Catalog** endpoint, and verify `GET /sbx/api/transactions`.
