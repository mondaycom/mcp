import { z } from 'zod';
import { ApiClient } from '@mondaydotcomorg/api';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations, MondayApiToolContext } from '../base-monday-api-tool';
import { trackEvent } from '../../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../../utils/token.utils';

export const sendFeedbackToolSchema = {
  feedback_type: z
    .enum(['feedback', 'feature_request', 'bug_report'])
    .describe('The type of submission: general feedback, a feature request, or a bug report'),
  title: z.string().describe('A short summary of the feedback'),
  description: z.string().describe('Full details — what happened, what was expected, or what is being requested'),
  tool_name: z
    .string()
    .optional()
    .describe('The name of the MCP tool this feedback is about, if applicable (e.g. "create_item")'),
};

export class SendFeedbackTool extends BaseMondayApiTool<typeof sendFeedbackToolSchema> {
  name = 'send_feedback';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Send Feedback',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  private readonly _apiToken?: string | (() => string);

  constructor(
    mondayApi: ApiClient | (() => ApiClient),
    apiToken?: string | (() => string),
    context?: MondayApiToolContext,
  ) {
    super(mondayApi, context);
    this._apiToken = apiToken;
  }

  private get resolvedToken(): string | undefined {
    if (!this._apiToken) return undefined;
    return typeof this._apiToken === 'function' ? this._apiToken() : this._apiToken;
  }

  getDescription(): string {
    return (
      'Submit feedback, a feature request, or a bug report about the monday.com MCP server. ' +
      'Use this when a user or agent wants to report an issue, suggest an improvement, or flag unexpected behavior. ' +
      'Optionally specify tool_name to associate the feedback with a specific MCP tool.'
    );
  }

  getInputSchema(): typeof sendFeedbackToolSchema {
    return sendFeedbackToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof sendFeedbackToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const tokenInfo = this.resolvedToken ? extractTokenInfo(this.resolvedToken) : {};

    trackEvent({
      name: 'mcp_feedback_submitted',
      data: {
        feedback_type: input.feedback_type,
        title: input.title,
        description: input.description,
        ...(input.tool_name && { tool_name: input.tool_name }),
        ...(this.context?.agentType && { agent_type: this.context.agentType }),
        ...(this.context?.agentClientName && { agent_client_name: this.context.agentClientName }),
        ...tokenInfo,
      },
    });

    return {
      content: {
        message: 'Feedback submitted successfully. Thank you for helping improve the monday.com MCP server.',
      },
    };
  }
}
