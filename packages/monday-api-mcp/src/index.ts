#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MondayAgentToolkit } from '@mondaydotcomorg/agent-toolkit/mcp';
import { ToolMode } from '@mondaydotcomorg/agent-toolkit/core';
import { parseArgs, validateArgs } from './utils/args/args.service.js';
import { Writable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes and starts the MCP server with the Monday Agent Toolkit
 * Uses stdio for transport
 */

async function runAtpMcpServer(token: string, version: string) {
  // CRITICAL: Disable ANSI colors BEFORE importing ATP
  // Pino outputs colored logs that corrupt MCP JSON-RPC protocol when parsed
  // process.env.NO_COLOR = '1';
  // process.env.FORCE_COLOR = '0';

  // // CRITICAL: Save original stdout BEFORE redirecting
  // // MCP uses stdout for JSON-RPC protocol - any non-JSON-RPC output breaks communication
  // // ATP server/client uses Pino which writes directly to process.stdout, bypassing console
  // const originalStdoutWrite = process.stdout.write.bind(process.stdout);

  // // Redirect stdout to stderr PERMANENTLY for ATP/Pino logging
  // // This prevents any Pino logs during API calls from corrupting MCP protocol
  // process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
  //   return process.stderr.write(chunk, encoding, callback);
  // }) as typeof process.stdout.write;

  const { createServer } = await import('@mondaydotcomorg/atp-server');
  const { AgentToolProtocolClient, ToolNames } = await import('@mondaydotcomorg/atp-client');
  const { registerToolsWithMCP } = await import('@mondaydotcomorg/atp-mcp-adapter');
  const toolDescriptions: Record<string, string> = {
    [String(ToolNames.EXECUTE_CODE)]: `Execute Javascript code to call Monday.com APIs. MUST use 'return' to see results.

**API Pattern:** api.monday.query_xxx() for reads, api.monday.mutation_xxx() for writes.

**Critical Rules:**
- Use _fields parameter for nested data: 'id,name,columns{id,title,type},items_page{cursor}'
- ColumnValue has: id, type, text, value (NOT "title")
- items_page returns ~25 items - use pagination for more

**Multi-line Example:**
\`\`\`typescript
// 1. Get board with columns and cursor
const boards = await api.monday.query_boards({ 
  ids: ['BOARD_ID'],
  _fields: 'id,columns{id,title,type},items_page{cursor}'
});
const board = boards[0];

// 2. Find column by title
const statusCol = board.columns.find(c => c.title === 'Status')?.id;

// 3. Paginate items
let cursor = board.items_page.cursor;
const allItems = [];
for (let page = 0; page < 20; page++) {
  if (!cursor) break;
  const result = await api.monday.query_next_items_page({ 
    cursor, limit: 100,
    _fields: 'cursor,items{id,name,group{title},column_values{id,text}}'
  });
  allItems.push(...result.items);
  cursor = result.cursor;
}

// 4. Analyze and return
return { total: allItems.length, items: allItems.slice(0, 5) };
\`\`\`

Use AFTER exploring the API to understand available operations.`,

    [String(ToolNames.EXPLORE_API)]: `Explore Monday.com API structure using filesystem-like navigation. ALWAYS use this BEFORE writing code to discover available operations and parameters.

**Navigation Paths:**
- "/monday/query" - List all query operations (read data)
- "/monday/mutation" - List all mutation operations (write data)  
- "/monday/query/boards" - See parameters for boards query
- "/monday/query/items" - See parameters for items query

**Valid Exploration Pattern:**
2. Then: path="/monday/query" to see query operations
3. Then: path="/monday/query/<operation_name>" to see parameters

**DO NOT explore nested paths like:**
- /monday/query/boards/items_page (doesn't exist)
- /monday/query/boards/fields (doesn't exist)

Only explore: /monday/query, /monday/mutation, or /monday/query/<operation_name>

**Example Workflow:**
1. explore_api path="/monday/query" → discover "boards", "items", "users" operations  
2. explore_api path="/monday/query/boards" → see ids, _fields parameters
3. NOW write code using execute_code with discovered operations`,
  };

  // Create and configure the ATP server
  const server = createServer({ logger: 'none' });

  // Load Monday.com GraphQL API
  await server.loadGraphQL('https://api.monday.com/v2/get_schema?version=2025-10&format=sdl', {
    name: 'monday',
    url: 'https://api.monday.com/v2',
    headers: {
      Authorization: token,
      'API-Version': version || '2025-10',
    },
    queryDepthLimit: 2,
  });

  // Start the ATP server on a local port
  const PORT = 3456;
  await server.listen(PORT);

  // Create ATP client connected to the local server
  const client = new AgentToolProtocolClient({
    baseUrl: `http://localhost:${PORT}`,
  });
  await client.init({ name: 'monday-api-mcp', version: '1.0.0' });
  await client.connect();


  // Create an MCP server
  const mcpServer = new McpServer(
    {
      name: 'monday.com-atp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  const atpTools = client.getATPTools()
  .filter(tool => tool.name in toolDescriptions)
  .map(tool => ({
    ...tool,
    description: toolDescriptions[tool.name],
  }));
  registerToolsWithMCP(atpTools, mcpServer as any);
  // // Register each ATP tool with the MCP server
  // for (const tool of atpTools) {
  //   // Use zodSchema.shape for MCP - it expects ZodRawShape (the shape property of ZodObject)
  //   // Fall back to empty object for tools without zodSchema (like execute_code)
  //   const paramsSchema = tool.zodSchema?.shape ?? {};

  //   mcpServer.tool(tool.name, tool.description || '', paramsSchema, async (args: Record<string, unknown>) => {
  //     try {
  //       const result = await tool.func(args);
  //       const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  //       return {
  //         content: [{ type: 'text' as const, text: resultText }],
  //       };
  //     } catch (error) {
  //       const errorMessage = error instanceof Error ? error.message : String(error);
  //       return {
  //         content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
  //         isError: true,
  //       };
  //     }
  //   });
  // }

  // // Create a custom writable stream for MCP that uses the original stdout
  // // This allows MCP JSON-RPC to work while keeping stdout redirected for Pino
  // const mcpOutputStream = new Writable({
  //   write(chunk, encoding, callback) {
  //     originalStdoutWrite(chunk, encoding as BufferEncoding, callback);
  //   },
  // });

  // Connect the MCP server to stdio transport with custom output stream
  // const transport = new StdioServerTransport(process.stdin, mcpOutputStream);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

async function runMcpServer(validatedArgs: ReturnType<typeof validateArgs>) {
  const toolkit = new MondayAgentToolkit({
    mondayApiToken: validatedArgs.token,
    mondayApiVersion: validatedArgs.version,
    mondayApiRequestConfig: {},
    toolsConfiguration: {
      readOnlyMode: validatedArgs.readOnlyMode,
      enableDynamicApiTools: validatedArgs.enableDynamicApiTools,
      mode: validatedArgs.mode,
      enableToolManager: false,
    },
  });

  const transport = new StdioServerTransport();
  await toolkit.connect(transport);
}

async function runServer() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);
  const validatedArgs = validateArgs(parsedArgs);

  if (validatedArgs.mode === ToolMode.ATP) {
    await runAtpMcpServer(validatedArgs.token, validatedArgs.version);
  } else {
    await runMcpServer(validatedArgs);
  }
}

runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
