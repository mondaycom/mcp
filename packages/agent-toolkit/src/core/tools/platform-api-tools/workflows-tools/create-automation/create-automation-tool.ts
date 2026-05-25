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
      'Natural-language description of the workflow to create. ' +
        'Describe the trigger (e.g. "when a new item is created"), conditions, and actions in plain English.',
    ),
  boardId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Optional target board ID (numeric, as a string). ' +
        'When omitted, the agent attempts to resolve the board from the prompt.',
    ),
};

interface LiteBuilderErrorEnvelope {
  error?: string;
  code?: string;
  reason?: unknown;
}

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

Use when the user has clearly described what to automate — both the trigger (what kicks it off) and the action (what should happen). If basic details are missing, ask the user first instead of calling with a vague prompt.

If the prompt is still ambiguous, the tool returns status: "needs_clarification" with the unresolved fields — present them to the user, gather answers, then call again.`;
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
          ...(input.boardId ? { boardId: input.boardId } : {}),
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorBody = await readErrorBody(response);
        throw new Error(formatErrorMessage(response.status, errorBody));
      }

      const body = (await response.json()) as Record<string, unknown>;
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'create automation');
    }
  }
}

async function readErrorBody(response: Response): Promise<LiteBuilderErrorEnvelope | string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as LiteBuilderErrorEnvelope;
    } catch {
      return '';
    }
  }
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function formatErrorMessage(status: number, body: LiteBuilderErrorEnvelope | string): string {
  if (typeof body === 'string') {
    return `lite-builder responded with HTTP ${status}${body ? `: ${body}` : ''}`;
  }
  const parts: string[] = [`HTTP ${status}`];
  if (body.error) parts.push(body.error);
  if (body.code) parts.push(`code=${body.code}`);
  if (body.reason !== undefined) parts.push(`reason=${JSON.stringify(body.reason)}`);
  return `lite-builder responded with ${parts.join(' ')}`;
}
