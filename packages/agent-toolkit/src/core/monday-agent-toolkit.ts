import { ApiClientConfig } from '@mondaydotcomorg/api';
import { MondayApiToolContext } from './tools/platform-api-tools/base-monday-api-tool';

export enum ToolMode {
  API = 'api',
  APPS = 'apps',
  ATP = 'atp',
}

export type ToolsConfiguration = {
  include?: string[];
  exclude?: string[];
  readOnlyMode?: boolean;
  mode?: ToolMode;
  enableDynamicApiTools?: boolean | 'only';
  enableToolManager?: boolean;
};

export type MondayAgentToolkitConfig = {
  mondayApiToken: ApiClientConfig['token'];
  mondayApiVersion?: ApiClientConfig['apiVersion'];
  mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
  toolsConfiguration?: ToolsConfiguration;
  context?: MondayApiToolContext;
};
