import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { ApiClient } from '@mondaydotcomorg/api';
import { getFilteredToolInstances } from '../utils/tools/tools-filtering.utils';
import { z } from 'zod';
import { Tool } from '../core/tool';
import { MondayAgentToolkitConfig } from '../core/monday-agent-toolkit';

/**
 * Monday Agent Toolkit providing an MCP server with Monday.com tools
 */
export class MondayAgentToolkit extends McpServer {
  private readonly mondayApiClient: ApiClient;
  private readonly mondayApiToken: string;

  /**
   * Creates a new instance of the Monday Agent Toolkit
   * @param config Configuration for the toolkit
   */
  constructor(config: MondayAgentToolkitConfig) {
    super({
      name: 'monday.com',
      version: '1.0.0',
    });

    this.mondayApiClient = this.createApiClient(config);
    this.mondayApiToken = config.mondayApiToken;

    this.registerTools(config);
  }

  /**
   * Create and configure the Monday API client
   */
  private createApiClient(config: MondayAgentToolkitConfig): ApiClient {
    return new ApiClient({
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
  }

  /**
   * Register all tools with the MCP server
   */
  private registerTools(config: MondayAgentToolkitConfig): void {
    try {
      const toolInstances = this.initializeTools(config);
      toolInstances.forEach((tool) => this.registerTool(tool));
    } catch (error) {
      console.error('Failed to register tools:', error instanceof Error ? error.message : String(error));
      throw new Error(
        `Failed to initialize Monday Agent Toolkit: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Initialize both API and CLI tools
   */
  private initializeTools(config: MondayAgentToolkitConfig): Tool<any, any>[] {
    const instanceOptions = {
      apiClient: this.mondayApiClient,
      apiToken: this.mondayApiToken,
    };

    const filteredTools = getFilteredToolInstances(instanceOptions, config.toolsConfiguration);

    return filteredTools;
  }

  /**
   * Register a single tool with the MCP server
   */
  private registerTool(tool: Tool<any, any>): void {
    const inputSchema = tool.getInputSchema();

    if (!inputSchema) {
      this.registerNoInputTool(tool);
    } else {
      this.registerInputTool(tool, inputSchema);
    }
  }

  /**
   * Register a tool that doesn't require input
   */
  private registerNoInputTool(tool: Tool<any, any>): void {
    this.tool(tool.name, tool.getDescription(), async (_extra: any) => {
      try {
        const res = await tool.execute();
        return this.formatToolResult(res.content);
      } catch (error) {
        return this.handleToolError(error, tool.name);
      }
    });
  }

  /**
   * Register a tool that requires input
   */
  private registerInputTool(tool: Tool<any, any>, inputSchema: any): void {
    this.tool(tool.name, tool.getDescription(), inputSchema, async (args: any, _extra: any) => {
      try {
        const parsedArgs = z.object(inputSchema).safeParse(args);
        if (!parsedArgs.success) {
          throw new Error(`Invalid arguments: ${parsedArgs.error.message}`);
        }

        const res = await tool.execute(parsedArgs.data);
        return this.formatToolResult(res.content);
      } catch (error) {
        return this.handleToolError(error, tool.name);
      }
    });
  }

  getServer(): McpServer {
    return this;
  }

  /**
   * Format the tool result into the expected MCP format
   */
  private formatToolResult(content: string): CallToolResult {
    return {
      content: [{ type: 'text', text: content }],
    };
  }

  /**
   * Handle tool execution errors
   */
  private handleToolError(error: unknown, toolName: string): CallToolResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing tool ${toolName}:`, errorMessage);

    return {
      content: [
        {
          type: 'text',
          text: `Failed to execute tool ${toolName}: ${errorMessage}`,
        },
      ],
    };
  }
}
