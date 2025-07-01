import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult, ServerCapabilities } from '@modelcontextprotocol/sdk/types';
import { ApiClient } from '@mondaydotcomorg/api';
import { getFilteredToolInstances } from '../utils/tools/tools-filtering.utils';
import { z } from 'zod';
import { Tool } from '../core/tool';
import { MondayAgentToolkitConfig } from '../core/monday-agent-toolkit';
import { ManageToolsTool } from '../core/tools/platform-api-tools/manage-tools-tool';
import { DynamicToolManager } from './dynamic-tool-manager';

/**
 * Monday Agent Toolkit providing an MCP server with Monday.com tools
 */
export class MondayAgentToolkit extends McpServer {
  private readonly mondayApiClient: ApiClient;
  private readonly mondayApiToken: string;
  private readonly dynamicToolManager: DynamicToolManager = new DynamicToolManager();

  /**
   * Creates a new instance of the Monday Agent Toolkit
   * @param config Configuration for the toolkit
   */
  constructor(config: MondayAgentToolkitConfig) {
    super(
      {
        name: 'monday.com',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        } satisfies ServerCapabilities,
      },
    );

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
      toolInstances.forEach((tool) => this.registerSingleTool(tool));

      // Register the ManageToolsTool only if explicitly enabled
      if (config.toolsConfiguration?.enableToolManager === true) {
        this.registerManagementTool();
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize Monday Agent Toolkit: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register the management tool with toolkit reference
   */
  private registerManagementTool(): void {
    const manageTool = new ManageToolsTool();
    manageTool.setToolkitManager(this.dynamicToolManager);
    this.registerSingleTool(manageTool as Tool<any, any>);
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
  private registerSingleTool(tool: Tool<any, any>): void {
    const inputSchema = tool.getInputSchema();
    const mcpTool = this.registerTool(
      tool.name,
      {
        title: tool.annotations?.title,
        description: tool.getDescription(),
        inputSchema,
        annotations: tool.annotations,
      },
      async (args: any, _extra: any) => {
        try {
          let result;
          if (inputSchema) {
            const parsedArgs = z.object(inputSchema).safeParse(args);
            if (!parsedArgs.success) {
              throw new Error(`Invalid arguments: ${parsedArgs.error.message}`);
            }
            result = await tool.execute(parsedArgs.data);
          } else {
            result = await tool.execute();
          }
          return this.formatToolResult(result.content);
        } catch (error) {
          return this.handleToolError(error, tool.name);
        }
      },
    );

    // Register the tool with the dynamic tool manager
    this.dynamicToolManager.registerTool(tool, mcpTool);
  }

  /**
   * Dynamically enable a tool
   */
  public enableTool(toolName: string): boolean {
    return this.dynamicToolManager.enableTool(toolName);
  }

  /**
   * Dynamically disable a tool
   */
  public disableTool(toolName: string): boolean {
    return this.dynamicToolManager.disableTool(toolName);
  }

  /**
   * Check if a tool is enabled
   */
  public isToolEnabled(toolName: string): boolean {
    return this.dynamicToolManager.isToolEnabled(toolName);
  }

  /**
   * Get list of all available tools and their status
   */
  public getToolsStatus(): Record<string, boolean> {
    return this.dynamicToolManager.getToolsStatus();
  }

  /**
   * Get list of all dynamic tool names
   */
  public getDynamicToolNames(): string[] {
    return this.dynamicToolManager.getDynamicToolNames();
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
