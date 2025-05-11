import { ApiClientConfig } from '@mondaydotcomorg/api';

export type ToolsConfiguration = {
  include?: string[];
  exclude?: string[];
  readOnlyMode?: boolean;
  enableDynamicApiTools?: boolean;
  enableMondayAppsTools?: boolean;
};

export type MondayAgentToolkitConfig = {
  mondayApiToken: ApiClientConfig['token'];
  mondayApiVersion?: ApiClientConfig['apiVersion'];
  mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
  toolsConfiguration?: ToolsConfiguration;
};
