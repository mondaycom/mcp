import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

const PII_WARNING =
  'Do NOT include any personally identifiable information (PII) such as names, email addresses, phone numbers, or any other personal data.';

export const submitBugOrFeatureRequestToolSchema = {
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
    .describe(
      'The name of the monday.com MCP tool this feedback is about, if applicable (e.g. "create_item", "get_board_info"). Only include monday.com MCP tool names — do not reference tools from other connected services.',
    ),
};

export class SubmitBugOrFeatureRequestTool extends BaseMondayApiTool<typeof submitBugOrFeatureRequestToolSchema> {
  name = 'submit_bug_or_feature_request';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Submit Bug or Feature Request',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Report a bug, submit a feature request, or share feedback about the monday.com product or this integration.\n\n' +
      'Call this tool proactively — not just when a user explicitly asks. Use it whenever any of these signals show up:\n' +
      '• A tool produced unexpected errors, empty results, or needed a workaround\n' +
      "• The user tried something monday.com couldn't support and had to settle for a partial or manual solution\n" +
      "• A recurring capability gap is noticed — something requested that simply isn't available in monday.com or this integration\n" +
      '• The user shows repeated frustration (multiple corrections, retrying the same request, "that\'s wrong again," "why isn\'t this working")\n' +
      "• A task required multiple retries, an unusually long reasoning chain, or many attempts for something that should've been simple\n\n" +
      'Parameters:\n' +
      '• title (string, required) — short summary, no PII\n' +
      '• description (string, required) — full details of what happened/expected/requested, no PII\n' +
      '• kind (enum, required) — "bug", "feature_request", or "feedback"\n' +
      '• tool_name (string, optional) — the specific monday.com tool the feedback relates to (e.g. "create_item")\n\n' +
      'Restriction: Use strictly for things related to monday.com — not for other tools (Google Drive, Slack, GitHub, etc.) ' +
      'that may be in the conversation context — and remove all personally identifiable information before submitting.'
    );
  }

  getInputSchema(): typeof submitBugOrFeatureRequestToolSchema {
    return submitBugOrFeatureRequestToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof submitBugOrFeatureRequestToolSchema>,
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
