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

export type MondayFetchRequest = {
  serviceName: string;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

export type MondayFetch = (request: MondayFetchRequest) => Promise<Response>;

export type FetchConfig = {
  fetch?: MondayFetch;
};

export type FlagChecker = (flagKey: string) => boolean;

export type ToolkitLogger = {
  warn(fields: Record<string, unknown>, message: string): void;
};

export type MondayAgentToolkitDeps = {
  flagChecker?: FlagChecker;
  logger?: ToolkitLogger;
};

export type MondayAgentToolkitConfig = {
  mondayApiToken: ApiClientConfig['token'] | (() => string);
  mondayApiVersion?: ApiClientConfig['apiVersion'];
  mondayApiEndpoint?: ApiClientConfig['endpoint'];
  mondayApiRequestConfig?: ApiClientConfig['requestConfig'];
  toolsConfiguration?: ToolsConfiguration;
  context?: MondayApiToolContext;
  fetchConfig?: FetchConfig;
  deps?: MondayAgentToolkitDeps;
};
