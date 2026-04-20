import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { SessionContext } from '../../executable';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { trackEvent } from '../../../utils/tracking.utils';

export type MondayApiToolContext = {
  // Operational context
  boardId?: number;
  apiVersion?: string;

  // Agent metadata (for tracking)
  agentType?: string;
  agentClientName?: string;
  clientRedirectUris?: string[];
};

export type BaseMondayApiToolConstructor = new (api: ApiClient) => BaseMondayApiTool<any>;

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
> implements Tool<Input, Output>
{
  abstract name: string;
  abstract type: ToolType;
  abstract annotations: ToolAnnotations;
  enabledByDefault?: boolean;

  protected sessionContext: SessionContext = {};

  constructor(
    protected readonly mondayApi: ApiClient,
    protected readonly context?: MondayApiToolContext,
  ) {}

  abstract getDescription(): string;
  abstract getInputSchema(): Input;

  async execute(input?: ToolInputType<Input>, sessionContext?: SessionContext): Promise<ToolOutputType<Output>> {
    this.sessionContext = sessionContext || {};

    const startTime = Date.now();
    let isError = false;

    try {
      const result = await this.executeInternal(input);
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const executionTimeMs = Date.now() - startTime;
      this.trackToolExecution(this.name, executionTimeMs, isError);
    }
  }

  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;

  private trackToolExecution(toolName: string, executionTimeMs: number, isError: boolean): void {
    try {
      trackEvent({
        name: 'monday_api_mcp_tool_execution',
        data: {
          toolName,
          executionTimeMs,
          isError,
          toolType: 'monday_api_tool',
        },
      });
    } catch {
      // ignore tracking errors
    }
  }
}
