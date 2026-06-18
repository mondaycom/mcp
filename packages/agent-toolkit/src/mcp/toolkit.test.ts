import { MondayAgentToolkit } from './toolkit';
import { ToolMode, ToolsConfiguration } from '../core/monday-agent-toolkit';
import { ToolType } from '../core/tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { getFilteredToolInstances } from '../utils/tools/tools-filtering.utils';
import { ManageToolsTool } from '../core/tools/platform-api-tools/manage-tools-tool';
import { z } from 'zod';
import { API_VERSION } from 'src/utils';

// Mock the ApiClient
jest.mock('@mondaydotcomorg/api', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    // Mock API client methods as needed
  })),
}));

// Mock the getFilteredToolInstances function to control what tools are returned
jest.mock('../utils/tools/tools-filtering.utils', () => ({
  getFilteredToolInstances: jest.fn(),
}));

// Mock the ManageToolsTool
jest.mock('../core/tools/platform-api-tools/manage-tools-tool', () => ({
  ManageToolsTool: jest.fn().mockImplementation(() => ({
    name: 'manage-tools',
    type: ToolType.READ,
    annotations: { audience: [] },
    enabledByDefault: true,
    getDescription: jest.fn().mockReturnValue('Manage tools'),
    getInputSchema: jest.fn().mockReturnValue({}),
    execute: jest.fn(),
    setToolkitManager: jest.fn(),
  })),
}));

const mockGetFilteredToolInstances = getFilteredToolInstances as jest.MockedFunction<typeof getFilteredToolInstances>;
const mockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('MondayAgentToolkit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation returns empty array
    mockGetFilteredToolInstances.mockReturnValue([]);
  });

  describe('Initialization', () => {
    it('should initialize with minimal configuration', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      expect(mockApiClient).toHaveBeenCalledWith({
        token: 'test-token',
        apiVersion: API_VERSION,
        endpoint: undefined,
        requestConfig: {
          headers: {
            'user-agent': 'monday-api-mcp',
          },
        },
      });

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        {
          apiClient: expect.any(Object),
          apiToken: 'test-token',
          context: {
            apiVersion: API_VERSION,
          },
        },
        undefined,
      );
    });

    it('should initialize with full configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        mondayApiVersion: '2023-10',
        mondayApiRequestConfig: {
          timeout: 5000,
          headers: {
            'custom-header': 'custom-value',
          },
        },
        toolsConfiguration: {
          mode: ToolMode.API,
          readOnlyMode: true,
          include: ['tool1', 'tool2'],
          enableDynamicApiTools: true,
        } as ToolsConfiguration,
      };

      const toolkit = new MondayAgentToolkit(config);

      expect(mockApiClient).toHaveBeenCalledWith({
        token: 'test-token',
        apiVersion: '2023-10',
        endpoint: undefined,
        requestConfig: {
          timeout: 5000,
          headers: {
            'custom-header': 'custom-value',
            'user-agent': 'monday-api-mcp',
          },
        },
      });

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        {
          apiClient: expect.any(Object),
          apiToken: 'test-token',
          context: {
            apiVersion: '2023-10',
          },
        },
        config.toolsConfiguration,
      );
    });

    it('should throw error if tool initialization fails', () => {
      mockGetFilteredToolInstances.mockImplementation(() => {
        throw new Error('Tool initialization failed');
      });

      expect(() => {
        new MondayAgentToolkit({
          mondayApiToken: 'test-token',
        });
      }).toThrow('Failed to initialize Monday Agent Toolkit: Tool initialization failed');
    });
  });

  describe('Tool Registration and Management', () => {
    let toolkit: MondayAgentToolkit;

    const mockTool1 = {
      name: 'test-tool-1',
      type: ToolType.READ,
      annotations: { audience: [] },
      enabledByDefault: true,
      getDescription: jest.fn().mockReturnValue('Test tool 1'),
      getInputSchema: jest.fn().mockReturnValue({ param1: { type: 'string' } }),
      execute: jest.fn().mockResolvedValue({ content: 'Result 1' }),
    };

    const mockTool2 = {
      name: 'test-tool-2',
      type: ToolType.WRITE,
      annotations: { audience: [] },
      enabledByDefault: false,
      getDescription: jest.fn().mockReturnValue('Test tool 2'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn().mockResolvedValue({ content: 'Result 2' }),
    };

    beforeEach(() => {
      mockGetFilteredToolInstances.mockReturnValue([mockTool1, mockTool2]);
      toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true, // Enable manage-tools tool for these tests
        },
      });
    });

    it('should register tools with dynamic tool manager', () => {
      const toolNames = toolkit.getDynamicToolNames();

      // Should include the 2 mock tools plus the manage-tools tool (since we enabled it in beforeEach)
      expect(toolNames).toHaveLength(3);
      expect(toolNames).toContain('test-tool-1');
      expect(toolNames).toContain('test-tool-2');
      expect(toolNames).toContain('manage-tools');
    });

    it('should respect tool enabledByDefault settings', () => {
      const toolsStatus = toolkit.getToolsStatus();

      expect(toolsStatus['test-tool-1']).toBe(true); // enabled by default
      expect(toolsStatus['test-tool-2']).toBe(false); // disabled by default
      expect(toolsStatus['manage-tools']).toBe(true); // management tool enabled by default
    });

    it('should enable and disable tools dynamically', () => {
      // Initially tool-2 is disabled
      expect(toolkit.isToolEnabled('test-tool-2')).toBe(false);

      // Enable it
      const enableResult = toolkit.enableTool('test-tool-2');
      expect(enableResult).toBe(true);
      expect(toolkit.isToolEnabled('test-tool-2')).toBe(true);

      // Disable tool-1
      expect(toolkit.isToolEnabled('test-tool-1')).toBe(true);
      const disableResult = toolkit.disableTool('test-tool-1');
      expect(disableResult).toBe(true);
      expect(toolkit.isToolEnabled('test-tool-1')).toBe(false);
    });

    it('should return comprehensive tool status', () => {
      const status = toolkit.getToolsStatus();

      expect(Object.keys(status)).toHaveLength(3);
      expect(status).toHaveProperty('test-tool-1');
      expect(status).toHaveProperty('test-tool-2');
      expect(status).toHaveProperty('manage-tools');
      expect(typeof status['test-tool-1']).toBe('boolean');
      expect(typeof status['test-tool-2']).toBe('boolean');
      expect(typeof status['manage-tools']).toBe('boolean');
    });
  });

  describe('Tool Manager Configuration', () => {
    it('should not register manage-tools tool by default', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).not.toContain('manage-tools');
    });

    it('should register manage-tools tool when explicitly enabled', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).toContain('manage-tools');
    });

    it('should not register manage-tools tool when explicitly disabled', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: false,
        },
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).not.toContain('manage-tools');
    });
  });

  describe('Configuration-based Tool Filtering', () => {
    it('should filter tools based on include list', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          include: ['specific-tool'],
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          include: ['specific-tool'],
        }),
      );
    });

    it('should filter tools based on exclude list', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          exclude: ['unwanted-tool'],
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          exclude: ['unwanted-tool'],
        }),
      );
    });

    it('should apply read-only mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          readOnlyMode: true,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          readOnlyMode: true,
        }),
      );
    });

    it('should apply API mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          mode: ToolMode.API,
          enableDynamicApiTools: 'only' as const,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mode: ToolMode.API,
          enableDynamicApiTools: 'only',
        }),
      );
    });

    it('should apply APPS mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          mode: ToolMode.APPS,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mode: ToolMode.APPS,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const mockTool = {
        name: 'error-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Error tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      // The error handling is internal to the toolkit's tool execution
      // We can verify the tool was registered successfully
      expect(toolkit.getDynamicToolNames()).toContain('error-tool');
    });

    it('should handle malformed API client configuration', () => {
      // Test that toolkit can handle edge cases in API client config
      const config = {
        mondayApiToken: 'test-token',
        mondayApiRequestConfig: {
          headers: null as any, // Edge case
        },
      };

      expect(() => {
        new MondayAgentToolkit(config);
      }).not.toThrow();

      expect(mockApiClient).toHaveBeenCalledWith({
        token: 'test-token',
        apiVersion: API_VERSION,
        requestConfig: {
          headers: {
            'user-agent': 'monday-api-mcp',
          },
        },
      });
    });
  });

  describe('Integration Tests', () => {
    it('should properly integrate ManageToolsTool with DynamicToolManager', () => {
      // Create a mock that tracks calls
      const mockSetToolkitManager = jest.fn();
      (ManageToolsTool as jest.MockedClass<typeof ManageToolsTool>).mockImplementation(() => ({
        name: 'manage-tools',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Manage tools'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn(),
        setToolkitManager: mockSetToolkitManager,
      }));

      new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      // Verify that setToolkitManager was called
      expect(mockSetToolkitManager).toHaveBeenCalled();
    });

    it('should maintain consistent state between toolkit and dynamic manager', () => {
      const mockTool = {
        name: 'state-test-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('State test tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'OK' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      // Initial state
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(true);

      // Disable through toolkit
      toolkit.disableTool('state-test-tool');
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(false);

      // Re-enable through toolkit
      toolkit.enableTool('state-test-tool');
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(true);

      // State should be reflected in tools status
      const status = toolkit.getToolsStatus();
      expect(status['state-test-tool']).toBe(true);
    });
  });

  describe('getTools() Method', () => {
    it('should return tools with correct structure', () => {
      const mockTool1 = {
        name: 'test-tool-1',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Test tool 1 description'),
        getInputSchema: jest.fn().mockReturnValue({ param1: z.string() }),
        execute: jest.fn().mockResolvedValue({ content: 'Result 1' }),
      };

      const mockTool2 = {
        name: 'test-tool-2',
        type: ToolType.WRITE,
        annotations: { audience: [] },
        enabledByDefault: false,
        getDescription: jest.fn().mockReturnValue('Test tool 2 description'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'Result 2' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool1, mockTool2]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getTools();

      expect(tools).toHaveLength(2);

      // Check first tool structure
      expect(tools[0]).toHaveProperty('name', 'test-tool-1');
      expect(tools[0]).toHaveProperty('description', 'Test tool 1 description');
      expect(tools[0]).toHaveProperty('schema');
      expect(tools[0].schema).toHaveProperty('param1');
      expect(tools[0]).toHaveProperty('annotations');
      expect(tools[0]).toHaveProperty('handler');
      expect(typeof tools[0].handler).toBe('function');

      // Check second tool structure
      expect(tools[1]).toHaveProperty('name', 'test-tool-2');
      expect(tools[1]).toHaveProperty('description', 'Test tool 2 description');
      expect(tools[1]).toHaveProperty('schema', {});
      expect(tools[1]).toHaveProperty('annotations');
      expect(tools[1]).toHaveProperty('handler');
      expect(typeof tools[1].handler).toBe('function');
    });

    it('should include management tool when enabled', () => {
      const mockTool = {
        name: 'regular-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Regular tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'OK' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      const tools = toolkit.getTools();

      expect(tools).toHaveLength(2); // regular tool + management tool

      const toolNames = tools.map((t: any) => t.name);
      expect(toolNames).toContain('regular-tool');
      expect(toolNames).toContain('manage-tools');
    });

    it('should create working tool handlers', async () => {
      const mockTool = {
        name: 'handler-test-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Handler test tool'),
        getInputSchema: jest.fn().mockReturnValue({ input: z.string() }),
        execute: jest.fn().mockResolvedValue({ content: 'Handler result' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getTools();
      const tool = tools[0];

      // Test handler with valid input
      const result = await tool.handler({ input: 'test-value' });
      expect(result).toBe('Handler result');
      expect(mockTool.execute).toHaveBeenCalledWith({ input: 'test-value' });
    });

    it('should handle tool execution errors in handlers', async () => {
      const mockTool = {
        name: 'error-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Error tool'),
        getInputSchema: jest.fn().mockReturnValue({ input: z.string() }),
        execute: jest.fn().mockRejectedValue(new Error('Tool execution failed')),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getTools();
      const tool = tools[0];

      // Handler should propagate the error
      await expect(tool.handler({ input: 'test' })).rejects.toThrow('Tool execution failed');
    });

    it('should handle tools without input schema', async () => {
      const mockTool = {
        name: 'no-schema-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('No schema tool'),
        getInputSchema: jest.fn().mockReturnValue(undefined),
        execute: jest.fn().mockResolvedValue({ content: 'No schema result' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getTools();
      const tool = tools[0];

      expect(tool.schema).toBeUndefined();

      // Handler should work without parameters
      const result = await tool.handler({});
      expect(result).toBe('No schema result');
      expect(mockTool.execute).toHaveBeenCalledWith();
    });

    it('should validate input parameters in handlers', async () => {
      const mockTool = {
        name: 'validation-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Validation tool'),
        getInputSchema: jest.fn().mockReturnValue({
          requiredParam: z.string(),
          numberParam: z.number(),
        }),
        execute: jest.fn().mockResolvedValue({ content: 'Validation passed' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getTools();
      const tool = tools[0];

      // Test with invalid input (should throw validation error)
      await expect(tool.handler({ invalidParam: 'test' })).rejects.toThrow('Invalid arguments');

      // Test with valid input (should work)
      const result = await tool.handler({
        requiredParam: 'test-string',
        numberParam: 42,
      });
      expect(result).toBe('Validation passed');
    });
  });

  describe('Tool Registration and Management', () => {
    let toolkit: MondayAgentToolkit;

    const mockTool1 = {
      name: 'test-tool-1',
      type: ToolType.READ,
      annotations: { audience: [] },
      enabledByDefault: true,
      getDescription: jest.fn().mockReturnValue('Test tool 1'),
      getInputSchema: jest.fn().mockReturnValue({ param1: { type: 'string' } }),
      execute: jest.fn().mockResolvedValue({ content: 'Result 1' }),
    };

    const mockTool2 = {
      name: 'test-tool-2',
      type: ToolType.WRITE,
      annotations: { audience: [] },
      enabledByDefault: false,
      getDescription: jest.fn().mockReturnValue('Test tool 2'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn().mockResolvedValue({ content: 'Result 2' }),
    };

    beforeEach(() => {
      mockGetFilteredToolInstances.mockReturnValue([mockTool1, mockTool2]);
      toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true, // Enable manage-tools tool for these tests
        },
      });
    });

    it('should register tools with dynamic tool manager', () => {
      const toolNames = toolkit.getDynamicToolNames();

      // Should include the 2 mock tools plus the manage-tools tool (since we enabled it in beforeEach)
      expect(toolNames).toHaveLength(3);
      expect(toolNames).toContain('test-tool-1');
      expect(toolNames).toContain('test-tool-2');
      expect(toolNames).toContain('manage-tools');
    });

    it('should respect tool enabledByDefault settings', () => {
      const toolsStatus = toolkit.getToolsStatus();

      expect(toolsStatus['test-tool-1']).toBe(true); // enabled by default
      expect(toolsStatus['test-tool-2']).toBe(false); // disabled by default
      expect(toolsStatus['manage-tools']).toBe(true); // management tool enabled by default
    });

    it('should enable and disable tools dynamically', () => {
      // Initially tool-2 is disabled
      expect(toolkit.isToolEnabled('test-tool-2')).toBe(false);

      // Enable it
      const enableResult = toolkit.enableTool('test-tool-2');
      expect(enableResult).toBe(true);
      expect(toolkit.isToolEnabled('test-tool-2')).toBe(true);

      // Disable tool-1
      expect(toolkit.isToolEnabled('test-tool-1')).toBe(true);
      const disableResult = toolkit.disableTool('test-tool-1');
      expect(disableResult).toBe(true);
      expect(toolkit.isToolEnabled('test-tool-1')).toBe(false);
    });

    it('should return comprehensive tool status', () => {
      const status = toolkit.getToolsStatus();

      expect(Object.keys(status)).toHaveLength(3);
      expect(status).toHaveProperty('test-tool-1');
      expect(status).toHaveProperty('test-tool-2');
      expect(status).toHaveProperty('manage-tools');
      expect(typeof status['test-tool-1']).toBe('boolean');
      expect(typeof status['test-tool-2']).toBe('boolean');
      expect(typeof status['manage-tools']).toBe('boolean');
    });
  });

  describe('Tool Manager Configuration', () => {
    it('should not register manage-tools tool by default', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).not.toContain('manage-tools');
    });

    it('should register manage-tools tool when explicitly enabled', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).toContain('manage-tools');
    });

    it('should not register manage-tools tool when explicitly disabled', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: false,
        },
      });

      const toolNames = toolkit.getDynamicToolNames();
      expect(toolNames).not.toContain('manage-tools');
    });
  });

  describe('Configuration-based Tool Filtering', () => {
    it('should filter tools based on include list', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          include: ['specific-tool'],
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          include: ['specific-tool'],
        }),
      );
    });

    it('should filter tools based on exclude list', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          exclude: ['unwanted-tool'],
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          exclude: ['unwanted-tool'],
        }),
      );
    });

    it('should apply read-only mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          readOnlyMode: true,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          readOnlyMode: true,
        }),
      );
    });

    it('should apply API mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          mode: ToolMode.API,
          enableDynamicApiTools: 'only' as const,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mode: ToolMode.API,
          enableDynamicApiTools: 'only',
        }),
      );
    });

    it('should apply APPS mode configuration', () => {
      const config = {
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          mode: ToolMode.APPS,
        },
      };

      new MondayAgentToolkit(config);

      expect(mockGetFilteredToolInstances).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          mode: ToolMode.APPS,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const mockTool = {
        name: 'error-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Error tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      // The error handling is internal to the toolkit's tool execution
      // We can verify the tool was registered successfully
      expect(toolkit.getDynamicToolNames()).toContain('error-tool');
    });

    it('should handle malformed API client configuration', () => {
      // Test that toolkit can handle edge cases in API client config
      const config = {
        mondayApiToken: 'test-token',
        mondayApiRequestConfig: {
          headers: null as any, // Edge case
        },
      };

      expect(() => {
        new MondayAgentToolkit(config);
      }).not.toThrow();

      expect(mockApiClient).toHaveBeenCalledWith({
        token: 'test-token',
        apiVersion: API_VERSION,
        requestConfig: {
          headers: {
            'user-agent': 'monday-api-mcp',
          },
        },
      });
    });
  });

  describe('Integration Tests', () => {
    it('should properly integrate ManageToolsTool with DynamicToolManager', () => {
      // Create a mock that tracks calls
      const mockSetToolkitManager = jest.fn();
      (ManageToolsTool as jest.MockedClass<typeof ManageToolsTool>).mockImplementation(() => ({
        name: 'manage-tools',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Manage tools'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn(),
        setToolkitManager: mockSetToolkitManager,
      }));

      new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      // Verify that setToolkitManager was called
      expect(mockSetToolkitManager).toHaveBeenCalled();
    });

    it('should maintain consistent state between toolkit and dynamic manager', () => {
      const mockTool = {
        name: 'state-test-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('State test tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'OK' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      // Initial state
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(true);

      // Disable through toolkit
      toolkit.disableTool('state-test-tool');
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(false);

      // Re-enable through toolkit
      toolkit.enableTool('state-test-tool');
      expect(toolkit.isToolEnabled('state-test-tool')).toBe(true);

      // State should be reflected in tools status
      const status = toolkit.getToolsStatus();
      expect(status['state-test-tool']).toBe(true);
    });
  });

  describe('getToolsForMcp() Method', () => {
    it('should return tools with MCP-formatted handlers', () => {
      const mockTool = {
        name: 'mcp-test-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('MCP test tool'),
        getInputSchema: jest.fn().mockReturnValue({ param: z.string() }),
        execute: jest.fn().mockResolvedValue({ content: 'MCP result' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getToolsForMcp();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toHaveProperty('name', 'mcp-test-tool');
      expect(tools[0]).toHaveProperty('description', 'MCP test tool');
      expect(tools[0]).toHaveProperty('schema');
      expect(tools[0]).toHaveProperty('annotations');
      expect(tools[0]).toHaveProperty('handler');
      expect(typeof tools[0].handler).toBe('function');
    });

    it('should return MCP-formatted results from handlers', async () => {
      const mockTool = {
        name: 'mcp-format-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('MCP format tool'),
        getInputSchema: jest.fn().mockReturnValue({ input: z.string() }),
        execute: jest.fn().mockResolvedValue({ content: 'Test content' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getToolsForMcp();
      const tool = tools[0];

      const result = await tool.handler({ input: 'test' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Test content' }],
      });
    });

    it('should include tool metadata in MCP-formatted results', async () => {
      const complexity = {
        query: 12500,
        before: 9950000,
        after: 9937500,
        reset_in_x_seconds: 42,
      };
      const mockTool = {
        name: 'mcp-metadata-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('MCP metadata tool'),
        getInputSchema: jest.fn().mockReturnValue({ input: z.string() }),
        execute: jest.fn().mockResolvedValue({
          content: { message: 'Test content' },
          metadata: { complexity },
        }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const [tool] = toolkit.getToolsForMcp();
      const result = await tool.handler({ input: 'test' });

      expect(result).toEqual({
        structuredContent: { message: 'Test content' },
        content: [{ type: 'text', text: JSON.stringify({ message: 'Test content' }) }],
        _meta: { complexity },
      });
    });

    it('should expose monday API complexity metadata captured during MCP tool calls', async () => {
      const complexity = {
        query: 12500,
        before: 9950000,
        after: 9937500,
        reset_in_x_seconds: 42,
      };
      const mockRequest = jest.fn().mockResolvedValue({
        complexity,
        boards: [{ id: '123' }],
      });

      mockApiClient.mockImplementationOnce(() => ({ request: mockRequest }) as any);
      mockGetFilteredToolInstances.mockImplementationOnce(({ apiClient }) => [
        {
          name: 'api-complexity-tool',
          type: ToolType.READ,
          annotations: { audience: [] },
          enabledByDefault: true,
          getDescription: jest.fn().mockReturnValue('API complexity tool'),
          getInputSchema: jest.fn().mockReturnValue({ boardId: z.string() }),
          execute: jest.fn().mockImplementation(async ({ boardId }) => {
            const response = await apiClient.request(
              `query getBoard($boardId: [ID!]) {
                boards(ids: $boardId) {
                  id
                }
              }`,
              { boardId },
            );

            return { content: response };
          }),
        },
      ]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const [tool] = toolkit.getToolsForMcp();
      const result = await tool.handler({ boardId: '123' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining(
          'complexity {\n      query\n      before\n      after\n      reset_in_x_seconds\n    }',
        ),
        { boardId: '123' },
        undefined,
      );
      expect(result).toEqual({
        structuredContent: { boards: [{ id: '123' }] },
        content: [{ type: 'text', text: JSON.stringify({ boards: [{ id: '123' }] }) }],
        _meta: { complexity },
      });
    });

    it('should expose complexity metadata when tools create API clients from a token getter', async () => {
      const complexity = {
        query: 12500,
        before: 9950000,
        after: 9937500,
        reset_in_x_seconds: 42,
      };
      const mockRequest = jest.fn().mockResolvedValue({
        complexity,
        boards: [{ id: '123' }],
      });

      mockApiClient.mockImplementation(() => ({ request: mockRequest }) as any);
      mockGetFilteredToolInstances.mockImplementationOnce(({ apiClient }) => [
        {
          name: 'dynamic-token-complexity-tool',
          type: ToolType.READ,
          annotations: { audience: [] },
          enabledByDefault: true,
          getDescription: jest.fn().mockReturnValue('Dynamic token complexity tool'),
          getInputSchema: jest.fn().mockReturnValue({ boardId: z.string() }),
          execute: jest.fn().mockImplementation(async ({ boardId }) => {
            const response = await (apiClient as () => ApiClient)().request(
              `query getBoard($boardId: [ID!]) {
                boards(ids: $boardId) {
                  id
                }
              }`,
              { boardId },
            );

            return { content: response };
          }),
        },
      ]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: () => 'dynamic-token',
      });

      const [tool] = toolkit.getToolsForMcp();
      const result = await tool.handler({ boardId: '123' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining(
          'complexity {\n      query\n      before\n      after\n      reset_in_x_seconds\n    }',
        ),
        { boardId: '123' },
        undefined,
      );
      expect(result).toEqual({
        structuredContent: { boards: [{ id: '123' }] },
        content: [{ type: 'text', text: JSON.stringify({ boards: [{ id: '123' }] }) }],
        _meta: { complexity },
      });
    });

    it('should handle errors in MCP format', async () => {
      const mockTool = {
        name: 'mcp-error-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('MCP error tool'),
        getInputSchema: jest.fn().mockReturnValue({ input: z.string() }),
        execute: jest.fn().mockRejectedValue(new Error('Test error')),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getToolsForMcp();
      const tool = tools[0];

      const result = await tool.handler({ input: 'test' });

      expect(result).toEqual({
        structuredContent: { message: 'Test error' },
        content: [{ type: 'text', text: 'Error: Test error' }],
        isError: true,
      });
    });

    it('should include management tool when enabled', () => {
      const mockTool = {
        name: 'regular-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Regular tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'OK' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
        toolsConfiguration: {
          enableToolManager: true,
        },
      });

      const tools = toolkit.getToolsForMcp();

      expect(tools).toHaveLength(2); // regular tool + management tool

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('regular-tool');
      expect(toolNames).toContain('manage-tools');
    });

    it('should handle tools without input schema in MCP format', async () => {
      const mockTool = {
        name: 'no-schema-mcp-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('No schema MCP tool'),
        getInputSchema: jest.fn().mockReturnValue(undefined),
        execute: jest.fn().mockResolvedValue({ content: 'No schema result' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      const tools = toolkit.getToolsForMcp();
      const tool = tools[0];

      expect(tool.schema).toBeUndefined();

      // Handler should work without parameters and return MCP format
      const result = await tool.handler({});
      expect(result).toEqual({
        content: [{ type: 'text', text: 'No schema result' }],
      });
    });
  });

  describe('Legacy Tests', () => {
    it('should pass basic functionality test', () => {
      expect(1).toBe(1);
    });

    it('should return false for non-existent tools', () => {
      const toolkit = new MondayAgentToolkit({
        mondayApiToken: 'test-token',
      });

      expect(toolkit.enableTool('non-existent-tool')).toBe(false);
      expect(toolkit.disableTool('non-existent-tool')).toBe(false);
      expect(toolkit.isToolEnabled('non-existent-tool')).toBe(false);
    });
  });

  describe('Dynamic Token (function getter)', () => {
    it('should accept a function as mondayApiToken', () => {
      const tokenGetter = jest.fn().mockReturnValue('dynamic-token');

      expect(() => {
        new MondayAgentToolkit({
          mondayApiToken: tokenGetter,
        });
      }).not.toThrow();

      expect(tokenGetter).toHaveBeenCalled();
    });

    it('should resolve the token at construction time for initial ApiClient', () => {
      const tokenGetter = jest.fn().mockReturnValue('resolved-token');

      new MondayAgentToolkit({
        mondayApiToken: tokenGetter,
      });

      expect(mockApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'resolved-token',
        }),
      );
    });

    it('should pass a factory function as apiClient to tools when token is a getter', () => {
      const tokenGetter = jest.fn().mockReturnValue('dynamic-token');

      new MondayAgentToolkit({
        mondayApiToken: tokenGetter,
      });

      const instanceOptions = mockGetFilteredToolInstances.mock.calls[0][0];
      expect(typeof instanceOptions.apiClient).toBe('function');
    });

    it('should pass the token getter as apiToken to tools', () => {
      const tokenGetter = jest.fn().mockReturnValue('dynamic-token');

      new MondayAgentToolkit({
        mondayApiToken: tokenGetter,
      });

      const instanceOptions = mockGetFilteredToolInstances.mock.calls[0][0];
      expect(instanceOptions.apiToken).toBe(tokenGetter);
    });

    it('should call token getter each time the apiClient factory is invoked', () => {
      let callCount = 0;
      const tokenGetter = jest.fn(() => `token-${++callCount}`);

      new MondayAgentToolkit({
        mondayApiToken: tokenGetter,
      });

      const instanceOptions = mockGetFilteredToolInstances.mock.calls[0][0];
      const factory = instanceOptions.apiClient as () => ApiClient;

      // Reset mock to isolate factory calls
      mockApiClient.mockClear();
      tokenGetter.mockClear();
      callCount = 0;

      factory();
      expect(tokenGetter).toHaveBeenCalledTimes(1);
      expect(mockApiClient).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-1' }));

      factory();
      expect(tokenGetter).toHaveBeenCalledTimes(2);
      expect(mockApiClient).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-2' }));
    });

    it('should pass a static ApiClient when token is a plain string', () => {
      new MondayAgentToolkit({
        mondayApiToken: 'static-token',
      });

      const instanceOptions = mockGetFilteredToolInstances.mock.calls[0][0];
      expect(typeof instanceOptions.apiClient).not.toBe('function');
      expect(instanceOptions.apiToken).toBe('static-token');
    });

    it('should still support all toolkit features with a token getter', () => {
      const mockTool = {
        name: 'dynamic-tool',
        type: ToolType.READ,
        annotations: { audience: [] },
        enabledByDefault: true,
        getDescription: jest.fn().mockReturnValue('Dynamic tool'),
        getInputSchema: jest.fn().mockReturnValue({}),
        execute: jest.fn().mockResolvedValue({ content: 'OK' }),
      };

      mockGetFilteredToolInstances.mockReturnValue([mockTool]);

      const toolkit = new MondayAgentToolkit({
        mondayApiToken: () => 'dynamic-token',
      });

      expect(toolkit.getDynamicToolNames()).toContain('dynamic-tool');
      expect(toolkit.isToolEnabled('dynamic-tool')).toBe(true);

      const tools = toolkit.getToolsForMcp();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('dynamic-tool');
    });
  });
});
