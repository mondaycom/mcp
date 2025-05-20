import { ApiClient } from '@mondaydotcomorg/api';
import { ToolType } from './tool';
import { BaseMondayApiTool } from './platform-api-tools/base-monday-api-tool';

export type ToolsConfiguration = {
  include?: string[];
  exclude?: string[];
  readOnlyMode?: boolean;
  enableDynamicApiTools?: boolean | 'only';
};

export function filterTools<T extends new (api: ApiClient) => BaseMondayApiTool<any>>(
  tools: T[],
  apiClient: ApiClient,
  config?: ToolsConfiguration,
): T[] {
  if (!config) {
    return tools;
  }

  let filteredTools = tools;

  // If dynamic API tools are enabled with 'only' option and read-only mode is not enabled
  if (config.enableDynamicApiTools && !config.readOnlyMode) {
    if (config.enableDynamicApiTools === 'only') {
      // When 'only' is specified, return only tools of type ALL_API
      return tools.filter((tool) => {
        const toolInstance = new tool(apiClient);
        return toolInstance.type === ToolType.ALL_API;
      });
    } else {
      return filteredTools;
    }
  }

  // If dynamic API tools are disabled or we're in read-only mode
  filteredTools = filteredTools.filter((tool) => {
    const toolInstance = new tool(apiClient);
    return toolInstance.type !== ToolType.ALL_API;
  });

  if (config.include) {
    filteredTools = tools.filter((tool) => {
      const toolInstance = new tool(apiClient);
      return config.include?.includes(toolInstance.name);
    });
  } else if (config.exclude) {
    filteredTools = tools.filter((tool) => {
      const toolInstance = new tool(apiClient);
      return !config.exclude?.includes(toolInstance.name);
    });
  }

  if (config.readOnlyMode) {
    filteredTools = filteredTools.filter((tool) => {
      const toolInstance = new tool(apiClient);
      return toolInstance.type === ToolType.QUERY;
    });
  }

  return filteredTools;
}
