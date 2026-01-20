export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export const MONDAY_APPS_DOMAIN = 'https://monday-apps-ms.monday.com';

const BASE_API = '/api';
const BASE_APPS = `${BASE_API}/apps`;
const BASE_APP_VERSIONS = `${BASE_API}/app-versions`;
const BASE_CODE = `${BASE_API}/code`;
const BASE_STORAGE = `${BASE_API}/storage`;

const APPS_URL = `${MONDAY_APPS_DOMAIN}${BASE_APPS}`;
const APP_VERSIONS_URL = `${MONDAY_APPS_DOMAIN}${BASE_APP_VERSIONS}`;
const CODE_URL = `${MONDAY_APPS_DOMAIN}${BASE_CODE}`;
const STORAGE_URL = `${MONDAY_APPS_DOMAIN}${BASE_STORAGE}`;

export const API_ENDPOINTS = {
  APPS: {
    GET_ALL: APPS_URL,
    CREATE: APPS_URL,
    CREATE_FROM_MANIFEST: `${APPS_URL}/manifest`,
    PROMOTE: (appId: number) => `${APPS_URL}/${appId}/promote`,
  },

  APP_VERSIONS: {
    GET_ALL: (appId: number) => `${APPS_URL}/${appId}/versions`,
    GET_BY_ID: (versionId: number) => `${APP_VERSIONS_URL}/${versionId}`,
  },

  APP_FEATURES: {
    GET_ALL: (appVersionId: number) => `${APP_VERSIONS_URL}/${appVersionId}/app-features`,
    CREATE: (appId: number, appVersionId: number) => `${APPS_URL}/${appId}/app-versions/${appVersionId}/app-features`,
  },

  STORAGE: {
    GET_BY_TERM: (appId: number, accountId: number, term: string) =>
      `${STORAGE_URL}/app/${appId}/account/${accountId}/records?term=${encodeURI(term)}`,
    EXPORT_DATA: (appId: number, accountId: number) =>
      `${STORAGE_URL}/app/${appId}/account/${accountId}/records/export`,
  },

  CODE: {
    GET_DEPLOYMENT_STATUS: (appVersionId: number) => `${CODE_URL}/${appVersionId}/deployments`,
    GET_DEPLOYMENT_SIGNED_URL: (appVersionId: number) => `${CODE_URL}/${appVersionId}/deployments/signed-url`,
    GET_ENV_KEYS: (appId: number) => `${CODE_URL}/${appId}/env-keys`,
    MANAGE_ENV: (appId: number, key: string) => `${CODE_URL}/${appId}/env/${key}`,
  },
  PLATFORM_BUILDING_BLOCKS_SCHEMAS: {
    GET_ALL: `${MONDAY_APPS_DOMAIN}/apps_ms/public/platform-building-blocks-schemas`,
  },
  // Apps microservice GraphQL (for apps-specific queries)
  GRAPHQL: `${MONDAY_APPS_DOMAIN}/graphql`,
  // Main monday.com API GraphQL (for platform queries like ask_developer_docs)
  MONDAY_API_GRAPHQL: 'https://api.monday.com/v2',
};

export const APPS_MS_TIMEOUT_IN_MS = 30000;
