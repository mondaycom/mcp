import { ApiClient } from '@mondaydotcomorg/api';
import { allGraphqlApiTools, allMondayAppsTools, allMondayDevTools, Tool, ToolType } from '../../core';
import { ToolMode, ToolsConfiguration } from '../../core/monday-agent-toolkit';
import { toolFactory } from './initializing.utils';

export const getFilteredToolInstances = (
  instanceOptions: { apiClient: ApiClient; apiToken: string },
  config?: ToolsConfiguration,
): Tool<any, any>[] => {
  let allToolConstructors: Array<new (...args: any[]) => Tool<any, any>> = [];
  if (config?.mode === ToolMode.APPS) {
    allToolConstructors = [...allMondayAppsTools];
  } else if (config?.mode === ToolMode.API || !config?.mode) {
    allToolConstructors = [...allGraphqlApiTools, ...allMondayDevTools];
  }

  const allToolInstances = allToolConstructors.map((ctor) => toolFactory(ctor, instanceOptions));

  return allToolInstances.filter((toolInstance) => {
    if (!config) {
      return toolInstance.type !== ToolType.ALL_API;
    }

    if (config.mode === ToolMode.API) {
      if (config.enableDynamicApiTools === 'only') {
        return toolInstance.type === ToolType.ALL_API;
      }
    }

    let shouldFilter = false;
    if (config.mode === ToolMode.API && config.enableDynamicApiTools === false) {
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
