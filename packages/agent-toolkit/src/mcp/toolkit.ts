import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { ApiClient, ApiClientConfig } from '@mondaydotcomorg/api';
import { Tool, allTools } from '../core';
import { filterTools, ToolsConfiguration } from '../core/utils';

export type MondayAgentToolkitConfig = {
  mondayApiToken: ApiClientConfig['token'];
  mondayApiVersion?: ApiClientConfig['apiVersion'];
  mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
  toolsConfiguration?: ToolsConfiguration;
};

export class MondayAgentToolkit extends McpServer {
  private readonly mondayApiClient: ApiClient;

  constructor(config: MondayAgentToolkitConfig) {
    super({
      name: 'monday.com',
      version: '1.0.0',
    });

    this.mondayApiClient = new ApiClient({
      token: config.mondayApiToken,
      apiVersion: config.mondayApiVersion,
      requestConfig: {
        ...config.mondayApiRequestConfig,
        headers: {
          ...(config.mondayApiRequestConfig?.headers || {}),
          'user-agent': 'monday-api-mcp',
        },
      },
    });

    const toolsToRegister = filterTools(allTools, this.mondayApiClient, config.toolsConfiguration);
    const tools = toolsToRegister.map((tool) => new tool(this.mondayApiClient)) as Tool<any, any>[];

    tools.forEach((tool) => {
      const inputSchema = tool.getInputSchema();
      if (!inputSchema) {
        this.tool(tool.name, tool.getDescription(), async (_extra: any) => {
          const res = await tool.execute();

          const result: CallToolResult = {
            content: [{ type: 'text', text: res.content }],
          };

          return result;
        });
      } else {
        this.tool(tool.name, tool.getDescription(), inputSchema, async (args: any, _extra: any) => {
          const parsedArgs = z.object(inputSchema).safeParse(args);
          if (!parsedArgs.success) {
            throw new Error(`Invalid arguments: ${parsedArgs.error.message}`);
          }

          const res = await tool.execute(parsedArgs.data);

          const result: CallToolResult = {
            content: [{ type: 'text', text: res.content }],
          };

          return result;
        });
      }
    });
  }

  getServer(): McpServer {
    return this;
  }
}
