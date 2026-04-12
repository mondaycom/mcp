import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { SessionContext } from '../../executable';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { trackEvent } from '../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../utils/token.utils';

export type MondayApiToolContext = {
  // Operational context
  boardId?: number;
  apiVersion?: string;

  // Agent metadata (for tracking)
  agentType?: string;
  agentClientName?: string;
  clientRedirectUris?: string[];
};

export type BaseMondayApiToolConstructor = new (api: ApiClient, token?: string) => BaseMondayApiTool<any>;

// Helper function to merge annotations with default openWorldHint
export function createMondayApiAnnotations(annotations: ToolAnnotations): ToolAnnotations {
  return {
    openWorldHint: true,
    ...annotations,
  };
}

export abstract class BaseMondayApiTool<
  Input extends ZodRawShape | undefined,
  Output extends Record<string, unknown> = never,
> implements Tool<Input, Output> {
  abstract name: string;
  abstract type: ToolType;
  abstract annotations: ToolAnnotations;
  enabledByDefault?: boolean;

  protected sessionContext: SessionContext = {};

  constructor(
    protected readonly mondayApi: ApiClient,
    protected readonly apiToken?: string,
    protected readonly context?: MondayApiToolContext,
  ) {}

  abstract getDescription(): string;
  abstract getInputSchema(): Input;

  /**
   * Public execute method that automatically tracks execution.
   * Accepts an optional sessionContext that tools can enrich with metadata
   * during executeInternal — the metadata flows into tracking events automatically.
   */
  async execute(input?: ToolInputType<Input>, sessionContext?: SessionContext): Promise<ToolOutputType<Output>> {
    const startTime = Date.now();
    let isError = false;
    this.sessionContext = sessionContext || {};

    try {
      const result = await this.executeInternal(input);
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const executionTimeInMs = Date.now() - startTime;
      this.trackToolExecution(this.name, executionTimeInMs, isError);
    }
  }

  /**
   * Abstract method that subclasses should implement for their actual logic
   */
  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;

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
    const tokenInfo = this.apiToken ? extractTokenInfo(this.apiToken) : {};

    trackEvent({
      name: 'monday_mcp_tool_execution',
      data: {
        toolName,
        executionTimeMs,
        isError,
        params,
        toolType: 'monday_api_tool',
        ...(this.context || {}),
        ...(this.sessionContext?.metadata || {}),
        ...tokenInfo,
      },
    });
  }
}
