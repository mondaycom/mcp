import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';

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

  constructor(
    protected readonly mondayApi: ApiClient,
    protected readonly context?: MondayApiToolContext,
  ) {}

  abstract getDescription(): string;
  abstract getInputSchema(): Input;

  /**
   * Public execute method
   */
  execute(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>> {
    return this.executeInternal(input);
  }

  /**
   * Abstract method that subclasses should implement for their actual logic
   */
  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
}
