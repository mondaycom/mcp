import { ApiClient } from '@mondaydotcomorg/api';
import { ZodRawShape } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { SessionContext } from '../../executable';
import { Tool, ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { FetchConfig } from '../../monday-agent-toolkit';

export type MondayApiToolContext = {
  // Operational context
  boardId?: number;
  apiVersion?: string;

  // Agent metadata (for tracking)
  agentType?: string;
  agentClientName?: string;
  clientRedirectUris?: string[];

  fetchConfig?: FetchConfig;
};

export type BaseMondayApiToolConstructor = new (api: ApiClient) => BaseMondayApiTool<any>;

// Helper function to merge annotations with default openWorldHint
export function createMondayApiAnnotations(annotations: ToolAnnotations): ToolAnnotations {
  return {
    openWorldHint: false,
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

  private readonly _mondayApiProvider: ApiClient | (() => ApiClient);

  constructor(mondayApi: ApiClient | (() => ApiClient), protected readonly context?: MondayApiToolContext) {
    this._mondayApiProvider = mondayApi;
  }

  protected get mondayApi(): ApiClient {
    return typeof this._mondayApiProvider === 'function' ? this._mondayApiProvider() : this._mondayApiProvider;
  }

  abstract getDescription(): string;
  abstract getInputSchema(): Input;

  /**
   * Public execute method
   */
  async execute(input?: ToolInputType<Input>, sessionContext?: SessionContext): Promise<ToolOutputType<Output>> {
    this.sessionContext = sessionContext || {};
    return this.executeInternal(input);
  }

  /**
   * Abstract method that subclasses should implement for their actual logic
   */
  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
}
