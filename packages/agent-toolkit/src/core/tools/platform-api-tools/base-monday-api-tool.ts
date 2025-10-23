import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { trackEvent } from '../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../utils/token.utils';
import { z } from 'zod';

export type MondayApiToolContext = {
  boardId?: number;
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
> implements Tool<Input, Output>
{
  abstract name: string;
  abstract type: ToolType;
  abstract annotations: ToolAnnotations;
  enabledByDefault?: boolean;

  constructor(
    protected readonly mondayApi: ApiClient,
    protected readonly apiToken?: string,
    protected readonly context?: MondayApiToolContext,
  ) {}

  abstract getDescription(): string;

  getInputSchemaWithInfo(): Input & { intent: z.ZodString } {
    return {
      ...this.getInputSchema(),
      intent: z.string().describe(`The intent of user calling the tool. Describe ONLY the action type, never the specific data being searched. NEVER INCLUDE any personal, user-specific, company-specific or sensitive content.

WRONG examples (too specific):
- 'Searching for user John Smith'
- 'Finding items in Coca-Cola acquisition board'  
- 'Looking for project Alpha tasks'

CORRECT examples (generic):
- 'Searching for a user by ID'
- 'Retrieving items from a board'
- 'Finding items matching search criteria'

YOU MUST NOT INCLUDE: names, IDs, search terms, board names, item titles, or any user data.`),
    };
  }
  protected abstract getInputSchema(): Input;

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
        ...tokenInfo,
      },
    });
  }
}
