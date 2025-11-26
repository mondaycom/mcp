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
  process.env.NO_COLOR = '1';
  process.env.FORCE_COLOR = '0';

  // CRITICAL: Save original stdout BEFORE redirecting
  // MCP uses stdout for JSON-RPC protocol - any non-JSON-RPC output breaks communication
  // ATP server/client uses Pino which writes directly to process.stdout, bypassing console
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);

  // Redirect stdout to stderr PERMANENTLY for ATP/Pino logging
  // This prevents any Pino logs during API calls from corrupting MCP protocol
  process.stdout.write = ((chunk: any, encoding?: any, callback?: any) => {
    return process.stderr.write(chunk, encoding, callback);
  }) as typeof process.stdout.write;

  const { createServer } = await import('@mondaydotcomorg/atp-server');
  const { AgentToolProtocolClient, createToolsFromATPClient } = await import('@mondaydotcomorg/atp-client');

  // Create and configure the ATP server
  const server = createServer({ logger: 'error' });

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

  // Create MCP-compliant tools from the ATP client
  const atpTools = createToolsFromATPClient(client);

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

  // Register each ATP tool with the MCP server
  for (const tool of atpTools) {
    // Use zodSchema.shape for MCP - it expects ZodRawShape (the shape property of ZodObject)
    // Fall back to empty object for tools without zodSchema (like execute_code)
    const paramsSchema = tool.zodSchema?.shape ?? {};

    mcpServer.tool(tool.name, tool.description || '', paramsSchema, async (args: Record<string, unknown>) => {
      try {
        const result = await tool.func(args);
        const resultText = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return {
          content: [{ type: 'text' as const, text: resultText }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  // Create a custom writable stream for MCP that uses the original stdout
  // This allows MCP JSON-RPC to work while keeping stdout redirected for Pino
  const mcpOutputStream = new Writable({
    write(chunk, encoding, callback) {
      originalStdoutWrite(chunk, encoding as BufferEncoding, callback);
    },
  });

  // Connect the MCP server to stdio transport with custom output stream
  const transport = new StdioServerTransport(process.stdin, mcpOutputStream);
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
