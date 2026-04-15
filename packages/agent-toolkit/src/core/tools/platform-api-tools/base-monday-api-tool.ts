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

  /**
   * Public execute method that automatically tracks SLI events
   */
  async execute(input?: ToolInputType<Input>, sessionContext?: SessionContext): Promise<ToolOutputType<Output>> {
    this.sessionContext = sessionContext || {};
    const startTime = Date.now();

    trackEvent({
      name: `mcp_sli_${this.name}_request`,
      data: { toolName: this.name },
    });

    try {
      const result = await this.executeInternal(input);

      trackEvent({
        name: `mcp_sli_${this.name}_success`,
        data: { toolName: this.name, executionTimeMs: Date.now() - startTime },
      });

      return result;
    } catch (error) {
      trackEvent({
        name: `mcp_sli_${this.name}_failure`,
        data: {
          toolName: this.name,
          executionTimeMs: Date.now() - startTime,
        },
      });
      throw error;
    }
  }

  /**
   * Abstract method that subclasses should implement for their actual logic
   */
  protected abstract executeInternal(input?: ToolInputType<Input>): Promise<ToolOutputType<Output>>;
}
