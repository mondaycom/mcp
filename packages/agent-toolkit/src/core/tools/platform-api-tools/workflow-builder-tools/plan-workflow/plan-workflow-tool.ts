import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import { WORKFLOW_PLANNER_AGENT_URL } from '../constants';

const REQUEST_TIMEOUT_MS = 180_000;

export const planWorkflowToolSchema = {
  prompt: z
    .string()
    .trim()
    .min(1, 'prompt must be a non-empty string')
    .max(2000, 'prompt must not exceed 2000 characters')
    .describe(
      'Natural-language description of the process to plan. Describe the full end-to-end process in plain English (e.g. "When a deal is marked Won, create a task in the onboarding board and notify the account manager"). The agent will decompose this into one or more monday.com workflows, identify all required boards and columns, and return a structured implementation plan. Maximum 2000 characters.',
    ),
};

export class PlanWorkflowTool extends BaseMondayApiTool<typeof planWorkflowToolSchema> {
  name = 'plan_workflow';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Plan Workflow',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  constructor(
    api: ApiClient | (() => ApiClient),
    private readonly apiToken: string | (() => string),
    context?: MondayApiToolContext,
  ) {
    super(api, context);
  }

  getDescription(): string {
    return `Plans one or more monday.com workflows for a described process using an AI agent.

The agent analyzes the prompt, decides how many workflows are needed, identifies the required boards and columns, selects the correct trigger and action blocks (with their IDs), and returns a structured implementation plan with Mermaid diagrams and build notes for each workflow.

Use this before create_workflow to understand how to break a complex process into individual workflows and which resources to create first.

Parameters:
- prompt: describe the full end-to-end process in plain English. Maximum 2000 characters.

Returns:
- result: structured markdown plan with workflow breakdowns, block IDs, resource definitions, and a list of assumptions and gaps
`;
  }

  getInputSchema() {
    return planWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof planWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const apiToken = typeof this.apiToken === 'function' ? this.apiToken() : this.apiToken;
      const response = await fetch(WORKFLOW_PLANNER_AGENT_URL, {
        method: 'POST',
        headers: {
          Authorization: apiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input.prompt }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`workflow-planner responded with HTTP ${response.status}${body ? `: ${body}` : ''}`);
      }

      const body = (await response.json()) as Record<string, unknown>;
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'plan workflow');
    }
  }
}
