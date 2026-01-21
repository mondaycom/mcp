import { ApiClient } from '@mondaydotcomorg/api';
import { Tool } from '../../core/tool';
import { BaseMondayApiTool, MondayApiToolContext } from '../../core/tools/platform-api-tools/base-monday-api-tool';
import { BaseMondayAppsTool } from '../../core/tools/monday-apps-tools/base-tool/base-monday-apps-tool';

export const toolFactory = (
  tool: new (...args: any[]) => Tool<any, any>,
  instanceOptions: { apiClient: ApiClient; apiToken: string; context?: MondayApiToolContext },
) => {
  if (tool.prototype instanceof BaseMondayApiTool) {
    return new tool(instanceOptions.apiClient, instanceOptions.apiToken, instanceOptions.context);
  } else if (tool.prototype instanceof BaseMondayAppsTool) {
    return new tool(instanceOptions.apiToken);
  }
  return new tool();
};
