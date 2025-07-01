import { ApiClientConfig } from '@mondaydotcomorg/api';

export enum ToolMode {
  API = 'api',
  APPS = 'apps',
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
};
