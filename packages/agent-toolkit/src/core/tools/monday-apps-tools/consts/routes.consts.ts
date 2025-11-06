export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export const MONDAY_APPS_DOMAIN = 'https://monday-apps-ms.monday.com';
const APPS_MS_PATH = '/apps_ms';

const BASE_API = '/api';
const BASE_APPS = `${BASE_API}/apps`;
const BASE_APP_VERSIONS = `${BASE_API}/app-versions`;
const BASE_CODE = `${BASE_API}/code`;
const BASE_STORAGE = `${BASE_API}/storage`;

const API_URL = `${MONDAY_APPS_DOMAIN}${BASE_API}`;
const APPS_URL = `${MONDAY_APPS_DOMAIN}${BASE_APPS}`;
const APP_VERSIONS_URL = `${MONDAY_APPS_DOMAIN}${BASE_APP_VERSIONS}`;
const CODE_URL = `${MONDAY_APPS_DOMAIN}${BASE_CODE}`;
const STORAGE_URL = `${MONDAY_APPS_DOMAIN}${BASE_STORAGE}`;
const APPS_MS_URL = `${MONDAY_APPS_DOMAIN}${APPS_MS_PATH}`;

export const API_ENDPOINTS = {
  APPS: {
    GET_ALL: APPS_URL,
    CREATE: APPS_URL,
    CREATE_FROM_MANIFEST: `${APPS_URL}/manifest`,
    GET_MANIFEST: (appId: number) => `${APPS_URL}/${appId}/manifest`,
    UPDATE_MANIFEST: (appId: number) => `${APPS_URL}/${appId}/manifest`,
    PROMOTE: (appId: number) => `${APPS_URL}/${appId}/promote`,
  },

  APP_VERSIONS: {
    GET_ALL: (appId: number) => `${APPS_URL}/${appId}/versions`,
    GET_BY_ID: (versionId: number) => `${APP_VERSIONS_URL}/${versionId}`,
    GET_STATUS: (path: string) => `${API_URL}/${path}`,
  },

  APP_FEATURES: {
    GET_ALL: (appVersionId: number) => `${APP_VERSIONS_URL}/${appVersionId}/app-features`,
    GET_WITH_TYPES: (appVersionId: number, types?: string[]) => {
      const url = `${APP_VERSIONS_URL}/${appVersionId}/app-features`;
      const appFeatureTypes = types?.map((type, index) => `type[${index}]=${type}`).join('&');
      return appFeatureTypes ? `${url}?${appFeatureTypes}` : url;
    },
    CREATE: (appId: number, appVersionId: number) => `${APPS_URL}/${appId}/app-versions/${appVersionId}/app-features`,
    CREATE_RELEASE: (appId: number, appVersionId: number, appFeatureId: number) =>
      `${APPS_URL}/${appId}/versions/${appVersionId}/app-features/${appFeatureId}/releases`,
  },

  STORAGE: {
    GET_BY_TERM: (appId: number, accountId: number, term: string) =>
      `${STORAGE_URL}/app/${appId}/account/${accountId}/records?term=${encodeURI(term)}`,
    EXPORT_DATA: (appId: number, accountId: number) =>
      `${STORAGE_URL}/app/${appId}/account/${accountId}/records/export`,
  },

  CODE: {
    APP_VERSION_BASE: (appVersionId: number) => `${CODE_URL}/${appVersionId}`,
    GET_DEPLOYMENT_STATUS: (appVersionId: number) => `${CODE_URL}/${appVersionId}/deployments`,
    GET_DEPLOYMENT_SIGNED_URL: (appVersionId: number) => `${CODE_URL}/${appVersionId}/deployments/signed-url`,
    UPLOAD_DEPLOYMENT: (appVersionId: number) => `${CODE_URL}/${appVersionId}/deployments`,
    GET_LOGS: (appVersionId: number, logsType: string, additionalParams?: string) =>
      `${CODE_URL}/${appVersionId}/logs?type=${logsType}${additionalParams || ''}`,
    GET_ENV_KEYS: (appId: number) => `${CODE_URL}/${appId}/env-keys`,
    MANAGE_ENV: (appId: number, key: string) => `${CODE_URL}/${appId}/env/${key}`,
    GET_SECRET_KEYS: (appId: number) => `${CODE_URL}/${appId}/secret-keys`,
    MANAGE_SECRET: (appId: number, key: string) => `${CODE_URL}/${appId}/secrets/${key}`,
    TUNNEL_TOKEN: `${CODE_URL}/tunnel-token`,
  },

  RELEASES: {
    GET_APP_RELEASES: (appVersionId: number) => `${APPS_MS_URL}/app-versions/${appVersionId}/releases`,
  },
};

export const APPS_MS_TIMEOUT_IN_MS = 30000;
