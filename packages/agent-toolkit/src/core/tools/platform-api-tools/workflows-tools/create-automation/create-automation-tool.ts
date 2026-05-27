import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

const LITE_BUILDER_AGENT_URL = 'https://api.monday.com/platform-ai-gateway/agents/lite-builder';
const REQUEST_TIMEOUT_MS = 180_000;

export const createAutomationToolSchema = {
  userPrompt: z
    .string()
    .trim()
    .min(1, 'userPrompt must be a non-empty string')
    .describe(
      'Natural-language description of the automation to create. ' +
        'Describe the trigger, conditions, and what should happen in plain English.',
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
    api: ApiClient,
    private readonly apiToken: string,
    context?: MondayApiToolContext,
  ) {
    super(api, context);
  }

  getDescription(): string {
    return `Creates an automation on a monday board from a natural-language description (e.g. "notify me when status changes to Done").

Use when the user has clearly described what to automate — both the trigger (what kicks it off) and the action (what should happen), and you know which board to create it on. If basic details are missing (including boardId), ask the user first instead of calling with a vague prompt.

If the prompt is still ambiguous, the tool returns status: "needs_clarification" with the unresolved fields — present them to the user, gather answers, then call again.

Terminology:
    - Trigger: When the automation should run (e.g. "when a new item is created").
    - Conditions: additional conditions that must be met for the automation to run.
    - Actions: what the automation should do when it runs (can have multiple actions).
`;
  }

  getInputSchema() {
    return createAutomationToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createAutomationToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const response = await fetch(LITE_BUILDER_AGENT_URL, {
        method: 'POST',
        headers: {
          Authorization: this.apiToken,
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
        throw new Error(`lite-builder responded with HTTP ${response.status}${body ? `: ${body}` : ''}`);
      }

      const body = (await response.json()) as Record<string, unknown>;
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'create automation');
    }
  }
}
