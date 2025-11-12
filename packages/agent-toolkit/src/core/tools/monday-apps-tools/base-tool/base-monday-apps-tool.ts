import axios, { AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';
import { ZodRawShape } from 'zod';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { APPS_MS_TIMEOUT_IN_MS } from '../consts/routes.consts';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { trackEvent } from '../../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../../utils/token.utils';

export interface MondayApiResponse {
  statusCode: number;
  headers?: Record<string, string>;
  [key: string]: any;
}

export type MondayAppsToolType = new (mondayApiToken?: string) => BaseMondayAppsTool<any, any>;

export function createMondayAppsAnnotations(annotations: ToolAnnotations): ToolAnnotations {
  return {
    openWorldHint: true,
    ...annotations,
  };
}

export abstract class BaseMondayAppsTool<
  Input extends ZodRawShape | undefined,
  Output extends Record<string, unknown> = never,
> implements Tool<Input, Output>
{
  abstract name: string;
  abstract type: ToolType;
  abstract category: MondayAppsToolCategory;
  private mondayApiToken?: string;
  abstract annotations: ToolAnnotations;

  constructor(mondayApiToken?: string) {
    this.mondayApiToken = mondayApiToken;
  }

  abstract getDescription(): string;
  abstract getInputSchema(): Input;

  /**
   * Public execute method that automatically tracks execution
   */
  async execute(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>> {
    const startTime = Date.now();
    let isError = false;

    try {
      const result = await this.executeInternal(input);
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const executionTimeInMs = Date.now() - startTime;
      this.trackToolExecution(this.name, executionTimeInMs, isError, input as Record<string, unknown>);
    }
  }

  /**
   * Abstract method that subclasses should implement for their actual logic
   */
  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;

  /**
   * Execute an API request to the monday.com  API
   */
  protected async executeApiRequest<T extends MondayApiResponse>(
    method: string,
    endpoint: string,
    options: {
      data?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      timeout?: number;
    } = {},
  ): Promise<T> {
    if (!this.mondayApiToken) {
      throw new Error('Monday API token is required to execute monday.com  API requests');
    }

    const { data, query, headers = {}, timeout = APPS_MS_TIMEOUT_IN_MS } = options;
    const headersWithToken = {
      ...headers,
      Authorization: `${this.mondayApiToken}`,
      'Content-Type': 'application/json',
    };

    try {
      // Create a custom HTTPS agent to handle self-signed certificates
      const httpsAgent = new https.Agent({
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
        rejectUnauthorized: false,
      });

      const axiosConfig: AxiosRequestConfig = {
        method,
        url: endpoint,
        data,
        headers: headersWithToken,
        params: query,
        timeout,
        httpsAgent,
      };

      const response = await axios.request<T>(axiosConfig);

      return {
        ...response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      } as T;
    } catch (error: any) {
      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data || { message: error.message };

        throw new Error(
          `monday.com  API request failed with status ${statusCode}: ${
            typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
          }`,
        );
      }

      throw new Error(`Failed to execute monday.com  API request: ${error.message}`);
    }
  }

  /**
   * Tracks tool execution with timing and error information
   * @param toolName - The name of the tool being executed
   * @param executionTimeInMs - The time taken to execute the tool in milliseconds
   * @param isError - Whether the execution resulted in an error
   * @param params - The parameters passed to the tool
   */
  private trackToolExecution(
    toolName: string,
    executionTimeMs: number,
    isError: boolean,
    params?: Record<string, unknown>,
  ): void {
    const tokenInfo = this.mondayApiToken ? extractTokenInfo(this.mondayApiToken) : {};

    trackEvent({
      name: 'monday_mcp_tool_execution',
      data: {
        toolName,
        executionTimeMs,
        isError,
        params,
        toolType: 'monday_apps_tool',
        ...tokenInfo,
      },
    });
  }
}
