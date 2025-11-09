import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface DeploymentStatusResponse extends MondayApiResponse {
  status?: string;
  creationDate?: string;
  activeFromVersionId?: number;
}

export const getDeploymentStatusSchema = z.object({
  appVersionId: z.number().describe('The unique identifier of the app version to check deployment status for. Use this after promoting an app to monitor the deployment progress and verify it completed successfully'),
});

export interface TunnelTokenResponse extends MondayApiResponse {
  token: string;
  domain: string;
}

export const getTunnelTokenSchema = z.object({
  appId: z.number().optional().describe('The unique identifier of the app to get a development tunnel token for (optional). Tunnel tokens allow local development by creating a secure connection between your local environment and monday.com'),
});

export interface EnvVarResponse extends MondayApiResponse {
  success?: boolean;
}

export const baseEnvVarSchema = z.object({
  appId: z.number().describe('The unique identifier of the app to manage environment variables for. Environment variables are app-level settings available to all versions'),
  key: z.string().describe('The environment variable key/name (e.g., API_KEY, DATABASE_URL, DEBUG_MODE). Use uppercase with underscores by convention'),
});

export const setEnvVarSchema = baseEnvVarSchema.extend({
  value: z.string().describe('The value to set for this environment variable. Can be any string (API keys, URLs, configuration values, etc.). Values are stored securely and available at runtime'),
});

export const deleteEnvVarSchema = baseEnvVarSchema;

export interface EnvVarKeysResponse extends MondayApiResponse {
  keys: string[];
}

export const listEnvVarKeysSchema = z.object({
  appId: z.number().describe('The unique identifier of the app to list environment variable keys for. Returns only the keys (not values) for security. Get app IDs from get_all_apps'),
});
