/**
 * Example: Creating a custom MCP server with Monday.com tools
 *
 * This example demonstrates how to use the new getTools() method to create
 * your own MCP server and selectively register Monday.com tools alongside
 * tools from other sources.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MondayAgentToolkit } from '../src/mcp/toolkit';

// Example: Create your own MCP server
const server = new McpServer(
  {
    name: 'my-custom-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize Monday Agent Toolkit
const mondayToolkit = new MondayAgentToolkit({
  mondayApiToken: process.env.MONDAY_API_TOKEN || 'your-token-here',
  toolsConfiguration: {
    include: ['get_board_info', 'create_item'], // Only include specific tools
    readOnlyMode: false,
  },
});

// Get Monday tools as individual tool objects
const mondayTools = mondayToolkit.getTools();

console.log(`Found ${mondayTools.length} Monday.com tools:`);
mondayTools.forEach((tool) => {
  console.log(`- ${tool.name}: ${tool.description}`);
});

// Register Monday tools to your custom server
for (const tool of mondayTools) {
  server.tool(tool.name, tool.description, tool.schema, tool.handler);
}

// Add your own custom tools
server.tool(
  'my_custom_tool',
  'A custom tool that does something specific to my use case',
  {
    message: { type: 'string', description: 'A message to process' },
  },
  async (params) => {
    return `Processed: ${params.message}`;
  },
);

// Example: Add tools from another hypothetical toolkit
// const githubToolkit = new GitHubToolkit({ token: 'github-token' });
// const githubTools = githubToolkit.getTools();
// for (const tool of githubTools) {
//   server.tool(tool.name, tool.description, tool.schema, tool.handler);
// }

console.log('Custom MCP server configured with Monday.com tools and custom tools!');

export { server };
