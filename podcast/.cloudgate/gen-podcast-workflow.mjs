import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function buildPodcastCatalogMainScript(catalogJson) {
  const compact = JSON.stringify(JSON.parse(catalogJson));
  const forPython = compact
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  return `return '${forPython}'`;
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const catalogRaw = fs.readFileSync(path.join(dir, 'podcast-catalog.json'), 'utf8');
const mainScript = buildPodcastCatalogMainScript(catalogRaw);

const workflow = {
  projectId: 'af89639b-f5c7-4d4b-4ce8-08dec7a2e3e4',
  endpoint: {
    name: 'Podcast Catalog',
    route: 'podcasts',
    requestType: 'Get',
    allowAnonymous: true,
    enableLogging: true,
    isActive: true,
    nodeId: 'node_podcast_catalog',
  },
  nodes: [{
    id: 'node_podcast_catalog',
    name: 'PodcastCatalogFunction',
    nodeType: 'Function',
    nodeMarketId: 'C81329EF-5713-49EF-A634-80BF728472AD',
    mainScript,
  }],
};

const outPath = path.join(dir, 'podcast-catalog-workflow.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log('written', outPath);
