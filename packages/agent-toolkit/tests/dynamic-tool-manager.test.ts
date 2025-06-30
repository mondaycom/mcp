import { DynamicToolManager } from '../src/mcp/dynamic-tool-manager';
import { Tool, ToolType } from '../src/core/tool';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';

// Mock types for testing
interface MockMCPToolHandle {
  enable: jest.Mock;
  disable: jest.Mock;
}

interface MockTool extends Tool<any, any> {
  name: string;
  type: ToolType;
  annotations: ToolAnnotations;
  enabledByDefault?: boolean;
  getDescription: jest.Mock;
  getInputSchema: jest.Mock;
  execute: jest.Mock;
}

describe('DynamicToolManager', () => {
  let manager: DynamicToolManager;
  let mockMCPHandle1: MockMCPToolHandle;
  let mockMCPHandle2: MockMCPToolHandle;
  let mockMCPHandle3: MockMCPToolHandle;
  let toolEnabledByDefault: MockTool;
  let toolDisabledByDefault: MockTool;
  let toolUndefinedDefault: MockTool;

  beforeEach(() => {
    manager = new DynamicToolManager();

    // Create mock MCP tool handles
    mockMCPHandle1 = {
      enable: jest.fn(),
      disable: jest.fn(),
    };

    mockMCPHandle2 = {
      enable: jest.fn(),
      disable: jest.fn(),
    };

    mockMCPHandle3 = {
      enable: jest.fn(),
      disable: jest.fn(),
    };

    // Create mock tools
    toolEnabledByDefault = {
      name: 'tool-enabled-default',
      type: ToolType.READ,
      annotations: { audience: [] },
      enabledByDefault: true,
      getDescription: jest.fn().mockReturnValue('Test tool enabled by default'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn(),
    };

    toolDisabledByDefault = {
      name: 'tool-disabled-default',
      type: ToolType.WRITE,
      annotations: { audience: [] },
      enabledByDefault: false,
      getDescription: jest.fn().mockReturnValue('Test tool disabled by default'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn(),
    };

    toolUndefinedDefault = {
      name: 'tool-undefined-default',
      type: ToolType.ALL_API,
      annotations: { audience: [] },
      // enabledByDefault is undefined - should default to true
      getDescription: jest.fn().mockReturnValue('Test tool with undefined default'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn(),
    };
  });

  describe('registerTool', () => {
    it('should register a tool enabled by default', () => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);

      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
      expect(manager.isToolEnabledByDefault('tool-enabled-default')).toBe(true);
      expect(mockMCPHandle1.disable).not.toHaveBeenCalled();
    });

    it('should register a tool disabled by default and disable it', () => {
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);

      expect(manager.isToolEnabled('tool-disabled-default')).toBe(false);
      expect(manager.isToolEnabledByDefault('tool-disabled-default')).toBe(false);
      expect(mockMCPHandle2.disable).toHaveBeenCalledTimes(1);
    });

    it('should register a tool with undefined enabledByDefault as enabled (default to true)', () => {
      manager.registerTool(toolUndefinedDefault, mockMCPHandle3);

      expect(manager.isToolEnabled('tool-undefined-default')).toBe(true);
      expect(manager.isToolEnabledByDefault('tool-undefined-default')).toBe(true);
      expect(mockMCPHandle3.disable).not.toHaveBeenCalled();
    });
  });

  describe('enableTool', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
    });

    it('should enable a disabled tool', () => {
      const result = manager.enableTool('tool-disabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-disabled-default')).toBe(true);
      expect(mockMCPHandle2.enable).toHaveBeenCalledTimes(1);
    });

    it('should return true when enabling an already enabled tool without calling enable again', () => {
      const result = manager.enableTool('tool-enabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
      expect(mockMCPHandle1.enable).not.toHaveBeenCalled();
    });

    it('should return false when trying to enable a non-existent tool', () => {
      const result = manager.enableTool('non-existent-tool');

      expect(result).toBe(false);
    });
  });

  describe('disableTool', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
    });

    it('should disable an enabled tool', () => {
      const result = manager.disableTool('tool-enabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(false);
      expect(mockMCPHandle1.disable).toHaveBeenCalledTimes(1);
    });

    it('should return true when disabling an already disabled tool without calling disable again', () => {
      const result = manager.disableTool('tool-disabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-disabled-default')).toBe(false);
      // disable should have been called once during registration
      expect(mockMCPHandle2.disable).toHaveBeenCalledTimes(1);
    });

    it('should return false when trying to disable a non-existent tool', () => {
      const result = manager.disableTool('non-existent-tool');

      expect(result).toBe(false);
    });
  });

  describe('isToolEnabled', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
    });

    it('should return true for enabled tool', () => {
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
    });

    it('should return false for disabled tool', () => {
      expect(manager.isToolEnabled('tool-disabled-default')).toBe(false);
    });

    it('should return false for non-existent tool', () => {
      expect(manager.isToolEnabled('non-existent-tool')).toBe(false);
    });
  });

  describe('isToolEnabledByDefault', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
      manager.registerTool(toolUndefinedDefault, mockMCPHandle3);
    });

    it('should return true for tool explicitly enabled by default', () => {
      expect(manager.isToolEnabledByDefault('tool-enabled-default')).toBe(true);
    });

    it('should return false for tool explicitly disabled by default', () => {
      expect(manager.isToolEnabledByDefault('tool-disabled-default')).toBe(false);
    });

    it('should return true for tool with undefined enabledByDefault', () => {
      expect(manager.isToolEnabledByDefault('tool-undefined-default')).toBe(true);
    });

    it('should return true for non-existent tool (default behavior)', () => {
      expect(manager.isToolEnabledByDefault('non-existent-tool')).toBe(true);
    });
  });

  describe('getToolsStatus', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
      manager.registerTool(toolUndefinedDefault, mockMCPHandle3);
    });

    it('should return status of all registered tools', () => {
      const status = manager.getToolsStatus();

      expect(status).toEqual({
        'tool-enabled-default': true,
        'tool-disabled-default': false,
        'tool-undefined-default': true,
      });
    });

    it('should return empty object when no tools are registered', () => {
      const emptyManager = new DynamicToolManager();
      const status = emptyManager.getToolsStatus();

      expect(status).toEqual({});
    });
  });

  describe('getDetailedToolsStatus', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
      manager.registerTool(toolUndefinedDefault, mockMCPHandle3);
    });

    it('should return detailed status with enabled and enabledByDefault for all tools', () => {
      const status = manager.getDetailedToolsStatus();

      expect(status).toEqual({
        'tool-enabled-default': {
          enabled: true,
          enabledByDefault: true,
        },
        'tool-disabled-default': {
          enabled: false,
          enabledByDefault: false,
        },
        'tool-undefined-default': {
          enabled: true,
          enabledByDefault: true,
        },
      });
    });
  });

  describe('getDynamicToolNames', () => {
    it('should return array of registered tool names', () => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);

      const names = manager.getDynamicToolNames();

      expect(names).toEqual(['tool-enabled-default', 'tool-disabled-default']);
    });

    it('should return empty array when no tools are registered', () => {
      const names = manager.getDynamicToolNames();

      expect(names).toEqual([]);
    });
  });

  describe('resetToolToDefault', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
    });

    it('should enable a tool that is disabled but enabled by default', () => {
      // First disable the tool
      manager.disableTool('tool-enabled-default');
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(false);

      // Reset to default
      const result = manager.resetToolToDefault('tool-enabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
      expect(mockMCPHandle1.enable).toHaveBeenCalledTimes(1);
    });

    it('should disable a tool that is enabled but disabled by default', () => {
      // First enable the tool
      manager.enableTool('tool-disabled-default');
      expect(manager.isToolEnabled('tool-disabled-default')).toBe(true);

      // Reset to default
      const result = manager.resetToolToDefault('tool-disabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-disabled-default')).toBe(false);
      // disable should have been called twice: once during registration, once during reset
      expect(mockMCPHandle2.disable).toHaveBeenCalledTimes(2);
    });

    it('should return true when tool is already at default state', () => {
      const result = manager.resetToolToDefault('tool-enabled-default');

      expect(result).toBe(true);
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      const result = manager.resetToolToDefault('non-existent-tool');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all registered tools', () => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);

      expect(manager.getDynamicToolNames()).toHaveLength(2);

      manager.clear();

      expect(manager.getDynamicToolNames()).toHaveLength(0);
      expect(manager.getToolsStatus()).toEqual({});
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      manager.registerTool(toolEnabledByDefault, mockMCPHandle1);
      manager.registerTool(toolDisabledByDefault, mockMCPHandle2);
    });

    it('should handle enabling and disabling tools multiple times', () => {
      // Tool starts enabled
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);

      // Disable it
      manager.disableTool('tool-enabled-default');
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(false);
      expect(mockMCPHandle1.disable).toHaveBeenCalledTimes(1);

      // Enable it again
      manager.enableTool('tool-enabled-default');
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(true);
      expect(mockMCPHandle1.enable).toHaveBeenCalledTimes(1);

      // Disable again
      manager.disableTool('tool-enabled-default');
      expect(manager.isToolEnabled('tool-enabled-default')).toBe(false);
      expect(mockMCPHandle1.disable).toHaveBeenCalledTimes(2);
    });

    it('should maintain correct state after multiple operations', () => {
      // Initial state
      let status = manager.getDetailedToolsStatus();
      expect(status['tool-enabled-default']).toEqual({ enabled: true, enabledByDefault: true });
      expect(status['tool-disabled-default']).toEqual({ enabled: false, enabledByDefault: false });

      // Change states
      manager.disableTool('tool-enabled-default');
      manager.enableTool('tool-disabled-default');

      status = manager.getDetailedToolsStatus();
      expect(status['tool-enabled-default']).toEqual({ enabled: false, enabledByDefault: true });
      expect(status['tool-disabled-default']).toEqual({ enabled: true, enabledByDefault: false });

      // Reset to defaults
      manager.resetToolToDefault('tool-enabled-default');
      manager.resetToolToDefault('tool-disabled-default');

      status = manager.getDetailedToolsStatus();
      expect(status['tool-enabled-default']).toEqual({ enabled: true, enabledByDefault: true });
      expect(status['tool-disabled-default']).toEqual({ enabled: false, enabledByDefault: false });
    });
  });
});
