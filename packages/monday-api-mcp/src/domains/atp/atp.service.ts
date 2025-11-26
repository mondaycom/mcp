import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ATP_PORT,
  ATP_SERVER_NAME,
  ATP_SERVER_VERSION,
  MONDAY_API_BASE_URL,
  MONDAY_API_NAME,
  DEFAULT_API_VERSION,
  QUERY_DEPTH_LIMIT,
  TOOL_DESCRIPTIONS,
  getMondaySchemaUrl,
} from './atp.consts.js';
import type { AtpServerConfig } from './atp.types.js';

// Dynamic imports required: ATP packages are ESM, this package is CJS
async function loadAtpDependencies() {
  const { createServer } = await import('@mondaydotcomorg/atp-server');
  const { AgentToolProtocolClient, ToolNames } = await import('@mondaydotcomorg/atp-client');
  const { registerToolsWithMCP } = await import('@mondaydotcomorg/atp-mcp-adapter');

  return { createServer, AgentToolProtocolClient, ToolNames, registerToolsWithMCP };
}

type AtpDependencies = Awaited<ReturnType<typeof loadAtpDependencies>>;
type CreateServerFn = AtpDependencies['createServer'];
type AtpClientClass = AtpDependencies['AgentToolProtocolClient'];
type AtpServer = ReturnType<CreateServerFn>;
type AtpClient = InstanceType<AtpClientClass>;
type AtpToolNames = AtpDependencies['ToolNames'];

function getToolDescriptions(ToolNames: AtpToolNames): Record<string, string> {
  return {
    [String(ToolNames.EXECUTE_CODE)]: TOOL_DESCRIPTIONS.execute_code,
    [String(ToolNames.EXPLORE_API)]: TOOL_DESCRIPTIONS.explore_api,
  };
}

function filterAndEnhanceTools(tools: ReturnType<AtpClient['getATPTools']>, toolDescriptions: Record<string, string>) {
  return tools
    .filter((tool) => tool.name in toolDescriptions)
    .map((tool) => ({
      ...tool,
      description: toolDescriptions[tool.name],
    }));
}

async function initAtpServer(createServer: CreateServerFn) {
  const server = createServer({ logger: 'none' });
  await server.listen(ATP_PORT);
  return server;
}

async function loadMondaySchema(server: AtpServer, token: string, version?: string) {
  const apiVersion = version ?? DEFAULT_API_VERSION;
  await server.loadGraphQL(getMondaySchemaUrl(apiVersion), {
    name: MONDAY_API_NAME,
    url: MONDAY_API_BASE_URL,
    headers: {
      Authorization: token,
      'API-Version': apiVersion,
    },
    queryDepthLimit: QUERY_DEPTH_LIMIT,
  });
}

async function initAtpClient(AgentToolProtocolClient: AtpClientClass) {
  const client = new AgentToolProtocolClient({
    baseUrl: `http://localhost:${ATP_PORT}`,
  });
  await client.init({ name: 'monday-api-mcp', version: '1.0.0' });
  await client.connect();
  return client;
}

function createMcpServer(): McpServer {
  return new McpServer(
    {
      name: ATP_SERVER_NAME,
      version: ATP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
}

export async function runAtpMcpServer(config: AtpServerConfig): Promise<void> {
  const { token, version } = config;

  const { createServer, AgentToolProtocolClient, ToolNames, registerToolsWithMCP } = await loadAtpDependencies();

  const server = await initAtpServer(createServer);
  await loadMondaySchema(server, token, version);

  const client = await initAtpClient(AgentToolProtocolClient);

  const mcpServer = createMcpServer();
  const toolDescriptions = getToolDescriptions(ToolNames);
  const atpTools = filterAndEnhanceTools(client.getATPTools(), toolDescriptions);

  registerToolsWithMCP(atpTools, mcpServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
