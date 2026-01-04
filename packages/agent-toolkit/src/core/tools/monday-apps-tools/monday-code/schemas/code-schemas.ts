import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface DeploymentStatusResponse extends MondayApiResponse {
  status?: string;
  creationDate?: string;
  activeFromVersionId?: number;
}

export const getDeploymentStatusSchema = z.object({
  appVersionId: z
    .number()
    .describe(
      'The unique identifier of the app version to check deployment status for. Use this after running mapps code:push to monitor the deployment progress and verify it completed successfully',
    ),
});

export interface TunnelTokenResponse extends MondayApiResponse {
  token: string;
  domain: string;
}

export interface EnvVarResponse extends MondayApiResponse {
  success?: boolean;
}

export const setEnvVarSchema = z.object({
  appId: z
    .number()
    .describe(
      'The unique identifier of the app to manage environment variables for. Environment variables are app-level settings available to all versions',
    ),
  key: z
    .string()
    .describe(
      'The environment variable key/name (e.g., API_KEY, DATABASE_URL, DEBUG_MODE). Use uppercase with underscores by convention',
    ),
  value: z
    .string()
    .describe(
      'The value to set for this environment variable. Can be any string (API keys, URLs, configuration values, etc.). Values are stored securely and available at runtime',
    ),
});

export interface EnvVarKeysResponse extends MondayApiResponse {
  keys: string[];
}

export const listEnvVarKeysSchema = z.object({
  appId: z
    .number()
    .describe(
      'The unique identifier of the app to list environment variable keys for. Returns only the keys (not values) for security. Get app IDs from get_all_apps',
    ),
});
