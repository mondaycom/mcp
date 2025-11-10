import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface DeploymentStatusResponse extends MondayApiResponse {
  status?: string;
  creationDate?: string;
  activeFromVersionId?: number;
}

export const getDeploymentStatusSchema = z.object({
  appVersionId: z.number().describe('The ID of the app version to get deployment status for'),
});

export interface TunnelTokenResponse extends MondayApiResponse {
  token: string;
  domain: string;
}

export const getTunnelTokenSchema = z.object({
  appId: z.number().optional().describe('The ID of the app to get a tunnel token for (optional)'),
});

export interface EnvVarResponse extends MondayApiResponse {
  success?: boolean;
}

export const baseEnvVarSchema = z.object({
  appId: z.number().describe('The ID of the app to manage environment variables for'),
  key: z.string().describe('The environment variable key'),
});

export const setEnvVarSchema = baseEnvVarSchema.extend({
  value: z.string().describe('The environment variable value'),
});

export const deleteEnvVarSchema = baseEnvVarSchema;

export interface EnvVarKeysResponse extends MondayApiResponse {
  keys: string[];
}

export const listEnvVarKeysSchema = z.object({
  appId: z.number().describe('The ID of the app to list environment variable keys for'),
});
