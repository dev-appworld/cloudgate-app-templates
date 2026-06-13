# Cloudgate Store Demo

Angular e-commerce store demo for the [Cloudgate](https://cloudgate.dev) **Web Coder** gallery. Browse products backed by a Cloudgate workflow (`GET /products`).

**Public demo:** [https://store-demo.cloudweb.dev/](https://store-demo.cloudweb.dev/)

## Screenshots

<p align="center">
  <img src="./banner.png" width="360" alt="Store demo preview" />
</p>

Mobile UI in light and dark mode. See the [live demo](https://store-demo.cloudweb.dev/) for the full experience.

## Local development

```bash
npm install
npm run start:local
```

Runs on **port 3000** with IdP and workflow proxying via `proxy.conf.json`.

## Workflow import

Import `.template/workflow-template.json`, publish the **Store Catalog** endpoint, and verify `GET /sbx/api/products`.
