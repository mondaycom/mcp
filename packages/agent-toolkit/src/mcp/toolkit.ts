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
 * Monday Agent Toolkit providing an MCP server with monday.com tools
 */
export class MondayAgentToolkit extends McpServer {
  private readonly mondayApiClient: ApiClient;
  private readonly mondayApiToken: string;
  private readonly dynamicToolManager: DynamicToolManager = new DynamicToolManager();
  private toolInstances: Tool<any, any>[] = [];
  private managementTool: Tool<any, any> | null = null;

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
      this.toolInstances = this.initializeTools(config);
      this.toolInstances.forEach((tool) => this.registerSingleTool(tool));

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
    this.managementTool = manageTool as Tool<any, any>;
    this.registerSingleTool(this.managementTool);
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
        ...tool,
        title: tool.annotations?.title,
        description: tool.getDescription(),
        inputSchema,
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
   * Get all tools as an array of tool objects that can be registered individually
   * Each tool includes name, description, schema, and handler for external registration
   * @returns Array of tool objects ready for individual registration
   */
  public getTools(): Array<{
    name: string;
    description: string;
    schema: any;
    handler: (params: any) => Promise<any>;
  }> {
    const allTools = [...this.toolInstances];

    // Include management tool if it exists
    if (this.managementTool) {
      allTools.push(this.managementTool);
    }

    return allTools.map((tool) => ({
      name: tool.name,
      description: tool.getDescription(),
      schema: tool.getInputSchema(),
      handler: this.createToolHandler(tool),
    }));
  }

  /**
   * Get all tools with MCP-formatted handlers for direct registration with MCP servers
   * This method wraps the handlers to return the proper CallToolResult format
   * @returns Array of tool objects with MCP-compatible handlers
   */
  public getToolsForMcp(): Array<{
    name: string;
    description: string;
    schema: any;
    handler: (params: any, extra?: any) => Promise<CallToolResult>;
  }> {
    const allTools = [...this.toolInstances];

    // Include management tool if it exists
    if (this.managementTool) {
      allTools.push(this.managementTool);
    }

    return allTools.map((tool) => ({
      name: tool.name,
      description: tool.getDescription(),
      schema: tool.getInputSchema(),
      handler: this.createMcpToolHandler(tool),
    }));
  }

  /**
   * Create a bound handler function for a tool that maintains access to toolkit state
   * @param tool The tool instance to create a handler for
   * @returns Async handler function that can be used externally
   */
  private createToolHandler(tool: Tool<any, any>) {
    return async (params: any) => {
      const inputSchema = tool.getInputSchema();

      if (inputSchema) {
        // inputSchema is already a Zod schema object definition, so we wrap it with z.object()
        const parsedArgs = z.object(inputSchema).safeParse(params);
        if (!parsedArgs.success) {
          throw new Error(`Invalid arguments: ${parsedArgs.error.message}`);
        }
        const result = await tool.execute(parsedArgs.data);
        return result.content;
      } else {
        const result = await tool.execute();
        return result.content;
      }
    };
  }

  /**
   * Create a bound handler function for a tool that returns MCP-formatted results
   * @param tool The tool instance to create a handler for
   * @returns Async handler function that returns CallToolResult format
   */
  private createMcpToolHandler(tool: Tool<any, any>) {
    return async (params: any, extra?: any): Promise<CallToolResult> => {
      try {
        const inputSchema = tool.getInputSchema();

        if (inputSchema) {
          // inputSchema is already a Zod schema object definition, so we wrap it with z.object()
          const parsedArgs = z.object(inputSchema).safeParse(params);
          if (!parsedArgs.success) {
            throw new Error(`Invalid arguments: ${parsedArgs.error.message}`);
          }
          const result = await tool.execute(parsedArgs.data);
          return {
            content: [{ type: 'text', text: String(result.content) }],
          };
        } else {
          const result = await tool.execute();
          return {
            content: [{ type: 'text', text: String(result.content) }],
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    };
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
      isError: true,
    };
  }
}
