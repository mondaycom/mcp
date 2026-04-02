import { z } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';

export const manageToolsSchema = {
  action: z
    .enum(['enable', 'disable', 'status', 'list', 'detailed', 'reset'])
    .describe(
      'Action to perform: "list" or "detailed" to discover available tools, "status" to check current states, "enable" to activate needed tools, "disable" to deactivate tools, "reset" to restore defaults',
    ),
  toolName: z.string().optional().describe('Name of the tool to manage (required for enable/disable/status/reset)'),
};

// Interface for the toolkit methods needed by this tool
export interface ToolkitManager {
  enableTool(toolName: string): boolean;
  disableTool(toolName: string): boolean;
  isToolEnabled(toolName: string): boolean;
  isToolEnabledByDefault(toolName: string): boolean;
  getToolsStatus(): Record<string, boolean>;
  getDetailedToolsStatus(): Record<string, { enabled: boolean; enabledByDefault: boolean }>;
  resetToolToDefault(toolName: string): boolean;
  getDynamicToolNames(): string[];
}

export class ManageToolsTool implements Tool<typeof manageToolsSchema> {
  name = 'manage_tools';
  type = ToolType.READ;
  enabledByDefault = true;
  annotations: ToolAnnotations = {
    title: 'Discover & Manage monday.com Tools',
    readOnlyHint: false, // This tool can modify tool states
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  };

  private toolkitManager?: ToolkitManager;

  /**
   * Set the toolkit manager reference after instantiation
   */
  setToolkitManager(manager: ToolkitManager): void {
    this.toolkitManager = manager;
  }

  getDescription(): string {
    return 'Discover and manage available monday.com tools. Use this tool first to see what tools are available, check which ones are active/inactive, and enable any tools you need for your tasks. When enabling a tool, you will be asked for confirmation first. Essential for understanding your monday.com toolkit capabilities.';
  }

  getInputSchema(): typeof manageToolsSchema {
    return manageToolsSchema;
  }

  async execute(input?: ToolInputType<typeof manageToolsSchema>): Promise<ToolOutputType<never>> {
    if (!this.toolkitManager) {
      throw new Error('Toolkit manager not initialized');
    }

    if (!input) {
      throw new Error('Input parameters are required');
    }

    const { action, toolName } = input;

    switch (action) {
      case 'enable': {
        if (!toolName) {
          throw new Error('Tool name is required for enable action');
        }

        if (this.toolkitManager.isToolEnabled(toolName)) {
          return {
            content: { action: 'enable', tool_name: toolName, success: true, message: `Tool '${toolName}' is already enabled`, enabled: true },
          };
        }

        const enableResult = this.toolkitManager.enableTool(toolName);
        return {
          content: {
            action: 'enable',
            tool_name: toolName,
            success: enableResult,
            message: enableResult ? `Tool '${toolName}' has been enabled and is now available for use` : `Failed to enable tool '${toolName}' (tool not found)`,
            enabled: enableResult,
          },
        };
      }

      case 'disable': {
        if (!toolName) {
          throw new Error('Tool name is required for disable action');
        }
        const disableResult = this.toolkitManager.disableTool(toolName);
        return {
          content: {
            action: 'disable',
            tool_name: toolName,
            success: disableResult,
            message: disableResult ? `Tool '${toolName}' has been disabled` : `Failed to disable tool '${toolName}' (tool not found)`,
            enabled: !disableResult,
          },
        };
      }

      case 'status': {
        if (toolName) {
          const enabled = this.toolkitManager.isToolEnabled(toolName);
          return {
            content: { action: 'status', tool_name: toolName, enabled },
          };
        } else {
          const allStatus = this.toolkitManager.getToolsStatus();
          return {
            content: { action: 'status', tools: allStatus },
          };
        }
      }

      case 'detailed': {
        const detailedStatus = this.toolkitManager.getDetailedToolsStatus();
        const activeTools = Object.entries(detailedStatus)
          .filter(([, status]) => status.enabled)
          .map(([name, status]) => ({ name, enabled_by_default: status.enabledByDefault }));
        const inactiveTools = Object.entries(detailedStatus)
          .filter(([, status]) => !status.enabled)
          .map(([name, status]) => ({ name, enabled_by_default: status.enabledByDefault, activate_hint: `{"action": "enable", "toolName": "${name}"}` }));

        return {
          content: { action: 'detailed', active_tools: activeTools, inactive_tools: inactiveTools },
        };
      }

      case 'reset': {
        if (!toolName) {
          throw new Error('Tool name is required for reset action');
        }
        const resetResult = this.toolkitManager.resetToolToDefault(toolName);
        const defaultState = this.toolkitManager.isToolEnabledByDefault(toolName);
        return {
          content: {
            action: 'reset',
            tool_name: toolName,
            success: resetResult,
            message: resetResult ? `Tool '${toolName}' has been reset to its default state` : `Failed to reset tool '${toolName}' (tool not found)`,
            default_state: defaultState,
          },
        };
      }

      case 'list': {
        const allStatus = this.toolkitManager.getToolsStatus();
        return {
          content: { action: 'list', tools: allStatus },
        };
      }

      default:
        throw new Error('Invalid action. Use: enable, disable, status, list, detailed, or reset');
    }
  }
}
