import { ApiClient } from "@mondaydotcomorg/api";
import { MondayAgentToolkitConfig, ToolMode } from "src/core/monday-agent-toolkit";
import { MondayAgentToolkit } from "src/mcp/toolkit";

export interface MockApiResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

/**
 * Creates a mock API client for testing
 * @returns An object with the mock API client and helper functions
 */
export function createMockApiClient() {
  const mockRequest = jest.fn();
  const mockApiClient = {
    request: mockRequest
  } as any;

  return {
    mockApiClient,
    mockRequest,

    setResponse: (data: any) => {
      mockRequest.mockResolvedValue(data);
    },

    setError: (messageOrError: string | Error, path: string[] = []) => {
      if (typeof messageOrError === 'string') {
        const error = new Error(messageOrError);
        (error as any).errors = [{ message: messageOrError, path }];
        mockRequest.mockRejectedValue(error);
      } else {
        mockRequest.mockRejectedValue(messageOrError);
      }
    },
 

    reset: () => {
      mockRequest.mockReset();
    },

    getMockRequest: () => mockRequest
  };
}

/**
 * Calls a tool by name and returns the parsed result. It's suggested to mock the API client and set the response before calling this function.
 * @param toolName - The name of the tool to call
 * @param args - The arguments to pass to the tool
 * @returns The parsed result of the tool ca  ll
 */
export async function callToolByNameAsync(toolName: string, args: any, config?: MondayAgentToolkitConfig): Promise<any> {
  const result = await callToolByNameRawAsync(toolName, args, config);

  const parsedResult = JSON.parse(result.content[0].text);
  return parsedResult;
}

/**
 * Calls a tool by name and returns the raw result. It's suggested to mock the API client and set the response before calling this function.
 * @param toolName - The name of the tool to call
 * @param args - The arguments to pass to the tool
 * @returns The raw result of the tool call
 */
export async function callToolByNameRawAsync(toolName: string, args: any, config?: MondayAgentToolkitConfig): Promise<any> {
  config ??= {mondayApiToken: 'test-token', toolsConfiguration: { mode: ToolMode.API } };
  const toolkit = new MondayAgentToolkit(config);

  const toolNames = toolkit.getDynamicToolNames();
  expect(toolNames).toContain(toolName);
  expect(toolkit.isToolEnabled(toolName)).toBe(true);

  // Get the registered MCP tool handler
  const server = toolkit.getServer();
  const tool = (server as any)._registeredTools[toolName];
  
  expect(tool).toBeDefined();

  // Call the tool through the MCP interface
  const result = await tool.callback(args, {});
  return result;
}