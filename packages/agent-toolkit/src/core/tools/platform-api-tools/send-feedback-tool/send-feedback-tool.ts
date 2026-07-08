import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { trackEvent } from '../../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../../utils/token.utils';

const PII_WARNING =
  'Do NOT include any personally identifiable information (PII) such as names, email addresses, phone numbers, or any other personal data.';

export const sendFeedbackToolSchema = {
  kind: z
    .enum(['feedback', 'feature_request', 'bug'])
    .describe('The kind of submission: general feedback, a feature request, or a bug report'),
  title: z.string().describe(`A short summary of the feedback. ${PII_WARNING}`),
  description: z
    .string()
    .describe(`Full details — what happened, what was expected, or what is being requested. ${PII_WARNING}`),
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

  getDescription(): string {
    return (
      'Submit feedback, a feature request, or a bug report about the monday.com MCP server. ' +
      'Use this when a user or agent wants to report an issue, suggest an improvement, or flag unexpected behavior. ' +
      'Optionally specify tool_name to associate the feedback with a specific MCP tool. ' +
      `IMPORTANT: ${PII_WARNING}`
    );
  }

  getInputSchema(): typeof sendFeedbackToolSchema {
    return sendFeedbackToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof sendFeedbackToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const token: string | undefined = (this.mondayApi as any).token;
    const { aai, uid, actid, rgn, tid } = token
      ? extractTokenInfo(token)
      : ({} as ReturnType<typeof extractTokenInfo>);

    trackEvent({
      name: 'mcp_feedback_submitted',
      data: {
        kind: input.kind,
        title: input.title,
        description: input.description,
        ...(input.tool_name && { tool_name: input.tool_name }),
        ...(this.context?.agentType && { agent_type: this.context.agentType }),
        ...(this.context?.agentClientName && { agent_client_name: this.context.agentClientName }),
        ...(actid !== undefined && { account_id: actid }),
        ...(uid !== undefined && { user_id: uid }),
        ...(aai !== undefined && { api_app_id: aai }),
        ...(rgn !== undefined && { region: rgn }),
        ...(tid !== undefined && { team_id: tid }),
      },
    });

    return {
      content: {
        message: 'Feedback submitted successfully. Thank you for helping improve the monday.com MCP server.',
      },
    };
  }
}
