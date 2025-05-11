import { ApiClient } from '@mondaydotcomorg/api';
import { allGraphqlApiTools, allMondayAppsTools, Tool, ToolType } from 'src/core';
import { ToolsConfiguration } from '../../core/monday-agent-toolkit';
import { toolFactory } from './initializing.utils';

export const getFilteredToolInstances = (
  instanceOptions: { apiClient: ApiClient; apiToken: string },
  config?: ToolsConfiguration,
): Tool<any, any>[] => {
  const allToolConstructors: Array<new (...args: any[]) => Tool<any, any>> = [...allGraphqlApiTools];
  if (config?.enableMondayAppsTools) {
    allToolConstructors.push(...allMondayAppsTools);
  }
  const allToolInstances = allToolConstructors.map((ctor) => toolFactory(ctor, instanceOptions));

  return allToolInstances.filter((toolInstance) => {
    if (!config) {
      return toolInstance.type !== ToolType.ALL_API;
    }
    let shouldFilter = false;
    if (!config.enableDynamicApiTools) {
      shouldFilter = shouldFilter || toolInstance.type === ToolType.ALL_API;
    }
    if (config.readOnlyMode) {
      shouldFilter = shouldFilter || toolInstance.type !== ToolType.READ;
    }
    if (config.include) {
      shouldFilter = shouldFilter || !config.include?.includes(toolInstance.name);
    } else if (config.exclude) {
      shouldFilter = shouldFilter || config.exclude?.includes(toolInstance.name);
    }
    return !shouldFilter;
  });
};
