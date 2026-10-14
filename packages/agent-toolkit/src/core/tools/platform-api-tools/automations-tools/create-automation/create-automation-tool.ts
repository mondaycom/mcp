import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext, ToolValidationError, UPSTREAM_HTTP_ERROR_CODE } from '../../../../../utils';
import { LITE_BUILDER_AGENT_PATH, PLATFORM_AGENT_SERVICE_NAME, resolveMondayFetch } from '../../ai-agent.utils';

const REQUEST_TIMEOUT_MS = 180_000;

export const createAutomationToolSchema = {
  userPrompt: z
    .string()
    .trim()
    .min(1, 'userPrompt must be a non-empty string')
    .describe(
      'Structured description of the automation to create.',
    ),
  boardId: z.string().trim().min(1, 'boardId must be a non-empty string').describe('The numeric board ID as a string.'),
};

export class CreateAutomationTool extends BaseMondayApiTool<typeof createAutomationToolSchema> {
  name = 'create_automation';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Automation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  constructor(
    api: ApiClient | (() => ApiClient),
    private readonly apiToken: string | (() => string),
    context?: MondayApiToolContext,
  ) {
    super(api, context);
  }

  getDescription(): string {
    return `
    Creates an automation on a monday board from a structured natural-language description.

Use this tool only when you know:
- boardId
- the user's intended trigger
- at least one intended action
- any details the user provided that are relevant to the trigger, conditions, or actions

The caller does not need to know the exact available automation blocks or their required fields. Describe the user's intent clearly — the tool will translate that intent into supported blocks and values.

If a required detail is missing from the user's request, ask for clarification before calling the tool.

If the tool returns status: "needs_clarification", present the unresolved fields to the user, gather answers, then call the tool again.

Describe the automation in this format:

Trigger:
  When <the event that should start the automation>
  Details:
    <relevant detail>: <value>

Conditions:
  - Only if <condition that should be true>
    Details:
      <relevant detail>: <value>

Actions:
  - <action the automation should perform>:
      <relevant detail>: <value>

Rules:
- Use one trigger.
- Conditions are optional.
- Multiple conditions mean AND.
- Use one or more actions.
- Do not use branching.
- Use natural language, not block IDs or internal field names.
- Actions may reference values from the trigger context, such as "{{item name}}", "{{creator}}", "{{status}}", "{{group}}", or "{{board}}".

Terminology:
- Trigger: the event that starts the automation, such as "when a new item is created".
- Conditions: optional requirements that must be true before actions run.
- Actions: what the automation does when it runs.

Example:

Trigger:
  When a new item is created

Actions:
  - Send a notification:
      Recipient: John Snow
      Title: Important Update
      Message: The item "{{item name}}" was created.

  - Move the item to a group:
      Group: Top group
`;
  }

  getInputSchema() {
    return createAutomationToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createAutomationToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const apiToken = typeof this.apiToken === 'function' ? this.apiToken() : this.apiToken;
      const mondayFetch = resolveMondayFetch(this.context);
      const response = await mondayFetch({
        serviceName: PLATFORM_AGENT_SERVICE_NAME,
        path: LITE_BUILDER_AGENT_PATH,
        method: 'POST',
        headers: {
          ...(this.context?.fetchConfig?.fetch ? {} : { Authorization: apiToken }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: input.userPrompt,
          boardId: input.boardId,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ToolValidationError(
          `lite-builder responded with HTTP ${response.status}${body ? `: ${body}` : ''}`,
          UPSTREAM_HTTP_ERROR_CODE,
        );
      }

      const body = (await response.json()) as Record<string, unknown>;
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'create automation');
    }
  }
}
