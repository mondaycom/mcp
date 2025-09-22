import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClientConfig } from '@mondaydotcomorg/api';
import { ZodRawShape, z, ZodTypeAny } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';

declare enum ToolMode {
    API = "api",
    APPS = "apps"
}
type ToolsConfiguration = {
    include?: string[];
    exclude?: string[];
    readOnlyMode?: boolean;
    mode?: ToolMode;
    enableDynamicApiTools?: boolean | 'only';
    enableToolManager?: boolean;
};
type MondayAgentToolkitConfig = {
    mondayApiToken: ApiClientConfig['token'];
    mondayApiVersion?: ApiClientConfig['apiVersion'];
    mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
    toolsConfiguration?: ToolsConfiguration;
};

/**
 * Monday Agent Toolkit providing an MCP server with monday.com tools
 */
declare class MondayAgentToolkit extends McpServer {
    private readonly mondayApiClient;
    private readonly mondayApiToken;
    private readonly dynamicToolManager;
    /**
     * Creates a new instance of the Monday Agent Toolkit
     * @param config Configuration for the toolkit
     */
    constructor(config: MondayAgentToolkitConfig);
    /**
     * Create and configure the Monday API client
     */
    private createApiClient;
    /**
     * Register all tools with the MCP server
     */
    private registerTools;
    /**
     * Register the management tool with toolkit reference
     */
    private registerManagementTool;
    /**
     * Initialize both API and CLI tools
     */
    private initializeTools;
    /**
     * Register a single tool with the MCP server
     */
    private registerSingleTool;
    /**
     * Dynamically enable a tool
     */
    enableTool(toolName: string): boolean;
    /**
     * Dynamically disable a tool
     */
    disableTool(toolName: string): boolean;
    /**
     * Check if a tool is enabled
     */
    isToolEnabled(toolName: string): boolean;
    /**
     * Get list of all available tools and their status
     */
    getToolsStatus(): Record<string, boolean>;
    /**
     * Get list of all dynamic tool names
     */
    getDynamicToolNames(): string[];
    getServer(): McpServer;
    /**
     * Format the tool result into the expected MCP format
     */
    private formatToolResult;
    /**
     * Handle tool execution errors
     */
    private handleToolError;
}

interface Executable<Input, Output> {
    execute: (input?: Input) => Promise<Output>;
}

type ToolInputType<Input extends ZodRawShape | undefined> = Input extends ZodRawShape ? z.objectOutputType<Input, ZodTypeAny> : undefined;
type ToolOutputType<T extends Record<string, unknown>> = {
    content: string;
    metadata?: T;
};
declare enum ToolType {
    READ = "read",
    WRITE = "write",
    ALL_API = "all_api"
}
interface Tool<Input extends ZodRawShape | undefined, Output extends Record<string, unknown> = never> extends Executable<ToolInputType<Input>, ToolOutputType<Output>> {
    name: string;
    type: ToolType;
    annotations: ToolAnnotations;
    /** Whether the tool is enabled by default. Defaults to true if not specified. */
    enabledByDefault?: boolean;
    getDescription(): string;
    getInputSchema(): Input;
}

interface ToolkitManager {
    enableTool(toolName: string): boolean;
    disableTool(toolName: string): boolean;
    isToolEnabled(toolName: string): boolean;
    isToolEnabledByDefault(toolName: string): boolean;
    getToolsStatus(): Record<string, boolean>;
    getDetailedToolsStatus(): Record<string, {
        enabled: boolean;
        enabledByDefault: boolean;
    }>;
    resetToolToDefault(toolName: string): boolean;
    getDynamicToolNames(): string[];
}

/**
 * Interface representing an MCP server tool registration handle
 */
interface MCPToolHandle {
    enable(): void;
    disable(): void;
}
/**
 * Interface for dynamic tool control
 */
interface DynamicTool {
    instance: Tool<any, any>;
    mcpTool: MCPToolHandle;
    enabled: boolean;
    enabledByDefault: boolean;
}
/**
 * Manages dynamic tool registration, enabling, and disabling
 */
declare class DynamicToolManager implements ToolkitManager {
    private readonly dynamicTools;
    /**
     * Register a tool for dynamic management
     */
    registerTool(tool: Tool<any, any>, mcpTool: MCPToolHandle): void;
    /**
     * Enable a specific tool
     */
    enableTool(toolName: string): boolean;
    /**
     * Disable a specific tool
     */
    disableTool(toolName: string): boolean;
    /**
     * Check if a tool is currently enabled
     */
    isToolEnabled(toolName: string): boolean;
    /**
     * Check if a tool is enabled by default
     */
    isToolEnabledByDefault(toolName: string): boolean;
    /**
     * Get list of all available tools and their status
     */
    getToolsStatus(): Record<string, boolean>;
    /**
     * Get list of all dynamic tool names
     */
    getDynamicToolNames(): string[];
    /**
     * Get list of all available tools with their current and default status
     */
    getDetailedToolsStatus(): Record<string, {
        enabled: boolean;
        enabledByDefault: boolean;
    }>;
    /**
     * Reset a tool to its default enabled state
     */
    resetToolToDefault(toolName: string): boolean;
    /**
     * Get all registered dynamic tools (for internal use)
     */
    getAllDynamicTools(): Map<string, DynamicTool>;
    /**
     * Clear all registered tools (for cleanup)
     */
    clear(): void;
}

export { DynamicToolManager, MondayAgentToolkit };
