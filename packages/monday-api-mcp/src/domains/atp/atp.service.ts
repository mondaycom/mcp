import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer as createNetServer } from 'net';
import {
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

/**
 * Gets the ATP port from environment variable, or returns undefined to use dynamic port allocation.
 * Set MONDAY_ATP_PORT environment variable to use a specific port.
 */
function getAtpPort(): number | undefined {
  const envPort = process.env.MONDAY_ATP_PORT;
  if (envPort) {
    const port = parseInt(envPort, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  return undefined; // Will use dynamic port allocation
}

/**
 * Finds an available port by binding to port 0 and letting the OS assign one.
 */
async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to get port from server address')));
      }
    });
    server.on('error', reject);
  });
}

async function initAtpServer(createServer: CreateServerFn): Promise<{ server: AtpServer; port: number }> {
  const server = createServer({ logger: 'none' });

  // Use configured port or find an available one
  const configuredPort = getAtpPort();
  const port = configuredPort ?? (await findAvailablePort());

  await server.listen(port);
  return { server, port };
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

async function initAtpClient(AgentToolProtocolClient: AtpClientClass, port: number) {
  const client = new AgentToolProtocolClient({
    baseUrl: `http://localhost:${port}`,
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

  const { server, port } = await initAtpServer(createServer);
  await loadMondaySchema(server, token, version);

  const client = await initAtpClient(AgentToolProtocolClient, port);

  const mcpServer = createMcpServer();
  const toolDescriptions = getToolDescriptions(ToolNames);
  const atpTools = filterAndEnhanceTools(client.getATPTools(), toolDescriptions);

  registerToolsWithMCP(atpTools, mcpServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}
