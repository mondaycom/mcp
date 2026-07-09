import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

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
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Send Feedback',
    readOnlyHint: true,
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
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.kind = input.kind;
    this.sessionContext.metadata.title = input.title;
    this.sessionContext.metadata.description = input.description;
    if (input.tool_name) {
      this.sessionContext.metadata.tool_name = input.tool_name;
    }

    return {
      content: {
        message: 'Feedback submitted successfully. Thank you for helping improve the monday.com MCP server.',
      },
    };
  }
}
