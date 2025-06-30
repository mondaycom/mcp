import { Tool } from '../core/tool';
import { ToolkitManager } from '../core/tools/platform-api-tools/manage-tools-tool';

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
  mcpTool: MCPToolHandle; // Reference to the MCP server tool
  enabled: boolean;
  enabledByDefault: boolean; // Track the original default state
}

/**
 * Manages dynamic tool registration, enabling, and disabling
 */
export class DynamicToolManager implements ToolkitManager {
  private readonly dynamicTools: Map<string, DynamicTool> = new Map();

  /**
   * Register a tool for dynamic management
   */
  registerTool(tool: Tool<any, any>, mcpTool: MCPToolHandle): void {
    // Store the tool reference for dynamic control
    const enabledByDefault = tool.enabledByDefault ?? true; // Default to true if not specified
    const initialEnabled = enabledByDefault;

    this.dynamicTools.set(tool.name, {
      instance: tool,
      mcpTool: mcpTool,
      enabled: initialEnabled,
      enabledByDefault: enabledByDefault,
    });

    // If the tool should be disabled by default, disable it after registration
    if (!enabledByDefault) {
      mcpTool.disable();
    }
  }

  /**
   * Enable a specific tool
   */
  enableTool(toolName: string): boolean {
    const dynamicTool = this.dynamicTools.get(toolName);
    if (!dynamicTool) {
      return false;
    }

    if (!dynamicTool.enabled) {
      dynamicTool.mcpTool.enable();
      dynamicTool.enabled = true;
    }
    return true;
  }

  /**
   * Disable a specific tool
   */
  disableTool(toolName: string): boolean {
    const dynamicTool = this.dynamicTools.get(toolName);
    if (!dynamicTool) {
      return false;
    }

    if (dynamicTool.enabled) {
      dynamicTool.mcpTool.disable();
      dynamicTool.enabled = false;
    }
    return true;
  }

  /**
   * Check if a tool is currently enabled
   */
  isToolEnabled(toolName: string): boolean {
    const dynamicTool = this.dynamicTools.get(toolName);
    return dynamicTool ? dynamicTool.enabled : false;
  }

  /**
   * Check if a tool is enabled by default
   */
  isToolEnabledByDefault(toolName: string): boolean {
    const dynamicTool = this.dynamicTools.get(toolName);
    return dynamicTool ? dynamicTool.enabledByDefault : true;
  }

  /**
   * Get list of all available tools and their status
   */
  getToolsStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.dynamicTools.forEach((dynamicTool, toolName) => {
      status[toolName] = dynamicTool.enabled;
    });
    return status;
  }

  /**
   * Get list of all dynamic tool names
   */
  getDynamicToolNames(): string[] {
    return Array.from(this.dynamicTools.keys());
  }

  /**
   * Get list of all available tools with their current and default status
   */
  getDetailedToolsStatus(): Record<string, { enabled: boolean; enabledByDefault: boolean }> {
    const status: Record<string, { enabled: boolean; enabledByDefault: boolean }> = {};
    this.dynamicTools.forEach((dynamicTool, toolName) => {
      status[toolName] = {
        enabled: dynamicTool.enabled,
        enabledByDefault: dynamicTool.enabledByDefault,
      };
    });
    return status;
  }

  /**
   * Reset a tool to its default enabled state
   */
  resetToolToDefault(toolName: string): boolean {
    const dynamicTool = this.dynamicTools.get(toolName);
    if (!dynamicTool) {
      return false;
    }

    if (dynamicTool.enabledByDefault && !dynamicTool.enabled) {
      dynamicTool.mcpTool.enable();
      dynamicTool.enabled = true;
      return true;
    } else if (!dynamicTool.enabledByDefault && dynamicTool.enabled) {
      dynamicTool.mcpTool.disable();
      dynamicTool.enabled = false;
      return true;
    }

    return true;
  }

  /**
   * Get all registered dynamic tools (for internal use)
   */
  getAllDynamicTools(): Map<string, DynamicTool> {
    return this.dynamicTools;
  }

  /**
   * Clear all registered tools (for cleanup)
   */
  clear(): void {
    this.dynamicTools.clear();
  }
}
