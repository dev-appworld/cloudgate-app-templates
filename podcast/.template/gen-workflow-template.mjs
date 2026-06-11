/**
 * Builds .template/workflow-template.json for Cloudgate Import (Projects[] format).
 * Regenerate after editing .cloudgate/podcast-catalog.json:
 *   node .template/gen-workflow-template.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TEMPLATE_ENDPOINT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TEMPLATE_NODE_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const FUNCTION_NODE_MARKET_ID = 'c81329ef-5713-49ef-a634-80bf728472ad';

function buildPodcastCatalogMainScript(catalogJson) {
  const compact = JSON.stringify(JSON.parse(catalogJson));
  const forPython = compact.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `return '${forPython}'`;
}

const templateDir = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(templateDir, '..', '.cloudgate', 'podcast-catalog.json');
const catalogRaw = fs.readFileSync(catalogPath, 'utf8');
const mainScript = buildPodcastCatalogMainScript(catalogRaw);

const workflowTemplate = {
  Projects: [
    {
      Name: 'Default',
      Path: 'api',
      IsPrivate: false,
      Template: {
        Endpoints: [
          {
            Name: 'Podcast Catalog',
            Route: 'podcasts',
            UseBasicAuthentication: false,
            Username: null,
            Password: null,
            EndpointType: 0,
            RequestType: 1,
            RunOnSchedule: false,
            ScheduleCron: null,
            ScheduledSandbox: false,
            ScheduledProduction: false,
            EnableRequestLimit: false,
            Daily: null,
            Weekly: null,
            Monthly: null,
            X: null,
            Y: null,
            AllowAnonymous: true,
            EnableLogging: true,
            IsAsync: false,
            EnableCache: false,
            CacheInMinutes: null,
            IsActive: true,
            IsPrivate: false,
            MaskData: false,
            NodeId: TEMPLATE_NODE_ID,
            Id: TEMPLATE_ENDPOINT_ID,
          },
        ],
        Nodes: [
          {
            Name: 'PodcastCatalogFunction',
            MainScript: mainScript,
            Url: null,
            HttpMethod: null,
            Body: null,
            Headers: [],
            Queries: [],
            Forms: [],
            ForwardRequestHeaders: false,
            ForwardFormData: false,
            ForwardParams: false,
            RichText: null,
            Decisions: [],
            PositiveNodeId: null,
            NegativeNodeId: null,
            Link: null,
            ImageId: null,
            NodeType: 1,
            NodeMarketId: FUNCTION_NODE_MARKET_ID,
            NodeId: null,
            ThreadEntryNodeId: null,
            EndpointId: TEMPLATE_ENDPOINT_ID,
            Width: null,
            Height: null,
            X: null,
            Y: null,
            Text: null,
            Border: null,
            ParentId: null,
            FileId: null,
            FileProdId: null,
            ScheduleEndpointId: null,
            ScheduleCron: null,
            ScheduleState: null,
            ExpireInMinutes: null,
            StartOfDay: null,
            DayOfWeek: null,
            DayOfMonth: null,
            StopOnError: false,
            SelectorName: null,
            SelectorIsGlobal: null,
            SelectorType: null,
            WebSocketId: null,
            WebSocketName: null,
            IdpOuputType: null,
            IdpAuthorizeAllowAnonymous: false,
            IdpUsersSkip: null,
            IdpUsersTake: null,
            IdpUsersFilter: null,
            Id: TEMPLATE_NODE_ID,
          },
        ],
        Keys: [],
        Databases: [],
        TestRequests: [],
        WebSockets: [],
        Snippets: [],
      },
    },
  ],
};

const outPath = path.join(templateDir, 'workflow-template.json');
fs.writeFileSync(outPath, JSON.stringify(workflowTemplate, null, 2));
console.log('written', outPath);
