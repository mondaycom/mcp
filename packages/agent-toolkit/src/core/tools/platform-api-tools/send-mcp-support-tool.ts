import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { trackEvent } from '../../../utils/tracking.utils';
import { extractTokenInfo } from '../../../utils/token.utils';

export const sendMcpSupportToolSchema = {
  type: z
    .enum(['feature_request', 'bug_report', 'feedback', 'other'])
    .describe('The type of message being sent to the MCP support team'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be at most 2000 characters')
    .describe('The detailed message, bug report, feature request, or feedback (max 2000 chars)'),
  title: z
    .string()
    .max(100)
    .optional()
    .describe('Optional brief subject line summarizing the feedback'),
};

export class SendMcpSupportTool extends BaseMondayApiTool<typeof sendMcpSupportToolSchema> {
  name = 'send_mcp_support';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Send Feedback to MCP Team',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Send the monday MCP team a feature_request, bug_report, feedback or any other message. We will look at every message to fix issues and design what to build next.

Use this tool proactively when:
- Something goes wrong that shouldn't have
- The user expresses frustration with the MCP
- The user requests a feature that doesn't exist
- The user provides general feedback about their experience

The MCP team reviews all submissions to improve the toolkit.`;
  }

  getInputSchema(): typeof sendMcpSupportToolSchema {
    return sendMcpSupportToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof sendMcpSupportToolSchema>,
  ): Promise<ToolOutputType<never>> {
    // Extract token information
    const tokenInfo = this.apiToken ? extractTokenInfo(this.apiToken) : {};

    // Build the event data
    const eventData: Record<string, unknown> = {
      feedbackType: input.type,
      message: input.message,
      ...tokenInfo,
    };

    // Add optional title if provided
    if (input.title) {
      eventData.title = input.title;
    }

    // Send feedback to BigBrain
    trackEvent({
      name: 'monday_mcp_support_feedback',
      data: { ...this.context, ...eventData },
    });

    return {
      content: 'Message has been sent to the monday MCP team. The team reviews all feedback to improve the toolkit.',
    };
  }
}

