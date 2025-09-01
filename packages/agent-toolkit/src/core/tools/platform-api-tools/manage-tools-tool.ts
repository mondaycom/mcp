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

        // Check if the tool is already enabled
        if (this.toolkitManager.isToolEnabled(toolName)) {
          return {
            content: `Tool '${toolName}' is already enabled`,
          };
        }

        const enableResult = this.toolkitManager.enableTool(toolName);
        return {
          content: enableResult
            ? `✅ Tool '${toolName}' has been enabled and is now available for use`
            : `❌ Failed to enable tool '${toolName}' (tool not found)`,
        };
      }

      case 'disable': {
        if (!toolName) {
          throw new Error('Tool name is required for disable action');
        }
        const disableResult = this.toolkitManager.disableTool(toolName);
        return {
          content: disableResult
            ? `Tool '${toolName}' has been disabled`
            : `Failed to disable tool '${toolName}' (tool not found)`,
        };
      }

      case 'status': {
        if (toolName) {
          const enabled = this.toolkitManager.isToolEnabled(toolName);
          return {
            content: `Tool '${toolName}' is ${enabled ? 'enabled' : 'disabled'}`,
          };
        } else {
          const allStatus = this.toolkitManager.getToolsStatus();
          const statusText = Object.entries(allStatus)
            .map(([name, enabled]) => `${name}: ${enabled ? 'enabled' : 'disabled'}`)
            .join('\n');
          return {
            content: `All tools status:\n${statusText}`,
          };
        }
      }

      case 'detailed': {
        const detailedStatus = this.toolkitManager.getDetailedToolsStatus();
        const enabledTools = Object.entries(detailedStatus).filter(([, status]) => status.enabled);
        const disabledTools = Object.entries(detailedStatus).filter(([, status]) => !status.enabled);

        let content = `monday.com Tools Discovery:\n\n`;

        if (enabledTools.length > 0) {
          content += `✅ ACTIVE TOOLS (ready to use):\n`;
          content += enabledTools
            .map(([name, status]) => `  • ${name} (default: ${status.enabledByDefault ? 'enabled' : 'disabled'})`)
            .join('\n');
        }

        if (disabledTools.length > 0) {
          content += `\n\n⚠️  INACTIVE TOOLS (need activation):\n`;
          content += disabledTools
            .map(
              ([name, status]) =>
                `  • ${name} (default: ${status.enabledByDefault ? 'enabled' : 'disabled'}) - use {"action": "enable", "toolName": "${name}"} to activate`,
            )
            .join('\n');
        }

        return {
          content: content,
        };
      }

      case 'reset': {
        if (!toolName) {
          throw new Error('Tool name is required for reset action');
        }
        const resetResult = this.toolkitManager.resetToolToDefault(toolName);
        const defaultState = this.toolkitManager.isToolEnabledByDefault(toolName);
        return {
          content: resetResult
            ? `Tool '${toolName}' has been reset to its default state (${defaultState ? 'enabled' : 'disabled'})`
            : `Failed to reset tool '${toolName}' (tool not found)`,
        };
      }

      case 'list': {
        const allStatus = this.toolkitManager.getToolsStatus();
        const toolsList = Object.entries(allStatus)
          .map(([name, enabled]) => `${name} (${enabled ? 'enabled' : 'disabled'})`)
          .join(', ');
        return {
          content: `Available tools: ${toolsList}`,
        };
      }

      default:
        throw new Error('Invalid action. Use: enable, disable, status, list, detailed, or reset');
    }
  }
}
