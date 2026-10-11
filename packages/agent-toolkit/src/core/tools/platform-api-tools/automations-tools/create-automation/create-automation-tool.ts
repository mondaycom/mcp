import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext, ToolValidationError, UPSTREAM_HTTP_ERROR_CODE } from '../../../../../utils';
import { LITE_BUILDER_AGENT_PATH, PLATFORM_AGENT_SERVICE_NAME, resolveMondayFetch } from '../../ai-agent.utils';

const REQUEST_TIMEOUT_MS = 180_000;
const NEEDS_CLARIFICATION_MESSAGE =
  'The automation was not created. Resolve each unresolved field: pick a candidate yourself when exactly one clearly fits the request, and ask the user only when it is genuinely ambiguous. Then call create_automation again with the full description including the resolved values.';

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

An automation is exactly ONE trigger, optional conditions (all must be true, AND only), then one or more actions that run in order. Actions can only use values from the trigger, such as the item, its column values, its creator or its group. Automations have no branching, waits, lookups or loops.

Use a workflow instead of this tool when the request needs any of:
- if/else or more than one path
- one step using the output of another step
- searching or looking up items on other boards
- looping over items
- waits or delays
- more than one trigger
- AI steps
- a trigger or action that isn't available as an automation

If this tool reports that the request can't be built as an automation, build it as a workflow instead of asking the user to rephrase.

Use this tool only when you know:
- boardId
- the user's intended trigger
- at least one intended action
- any details the user provided that are relevant to the trigger, conditions, or actions

Call get_board_info first and name the exact column, group and status label titles from the board in userPrompt.

If a required detail is missing from the user's request, ask for clarification before calling the tool.

If the tool returns status: "needs_clarification", nothing was created. The unresolved fields may include candidate values from the board. When exactly one candidate clearly fits the user's request, pick it yourself. Ask the user only when it's genuinely ambiguous. Then call the tool again with the full description, including the resolved values.

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
      if (body.status === 'needs_clarification') {
        return {
          content: {
            status: body.status,
            unresolvedFields: body.unresolvedFields,
            message: NEEDS_CLARIFICATION_MESSAGE,
          },
        };
      }
      if (body.status === 'activated') {
        return { content: { ...body, automationId: body.workflowId } };
      }
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'create automation');
    }
  }
}
