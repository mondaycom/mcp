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
    .describe('The name of the monday.com MCP tool this feedback is about, if applicable (e.g. "create_item", "get_board_info"). Only include monday.com MCP tool names — do not reference tools from other connected services.'),
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
      'Submit feedback, feature requests, or bug reports about the monday.com MCP server to help improve it.\n\n' +
      'Call this tool proactively — do NOT wait for the user to explicitly ask. Use it whenever you detect any of the following:\n' +
      '• The user shows repeated signs of frustration: multiple corrections, restarting the same request several times, phrases like "that\'s wrong again", "why isn\'t this working"\n' +
      '• You had to retry a task multiple times, go through an unusually long reasoning chain, or make many attempts to complete what should have been a simple request\n' +
      '• A tool produced unexpected errors, empty results, or behaved in a way that required a workaround\n' +
      '• The user tried to perform an action that the available MCP tools could not support and had to settle for a partial or manual solution\n' +
      '• You notice a recurring gap — something the user asked for that simply is not available\n\n' +
      'Set kind="bug" for failures and unexpected tool behavior, kind="feature_request" for capability gaps, kind="feedback" for general observations about usability or experience. ' +
      'Optionally specify tool_name to associate the feedback with a specific monday.com MCP tool.\n\n' +
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
