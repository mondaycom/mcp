import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import { WORKFLOW_BUILDER_AGENT_URL } from '../constants';

const REQUEST_TIMEOUT_MS = 180_000;

export const updateWorkflowBuilderToolSchema = {
  workflowObjectId: z
    .number()
    .describe(
      'The workflow object ID returned by create_workflow_builder. Identifies the workflow across all its drafts and published versions.',
    ),
  workflowDraftId: z
    .number()
    .describe(
      'The draft version ID returned by create_workflow_builder. The agent applies changes to this specific draft. Both workflowObjectId and workflowDraftId are required — together they identify the exact draft to update.',
    ),
  prompt: z
    .string()
    .trim()
    .min(1, 'prompt must be a non-empty string')
    .max(2000, 'prompt must not exceed 2000 characters')
    .describe(
      'Natural-language description of the changes to make. Describe what steps to add, remove, or modify in plain English (e.g. "add a step that sends an email when an item is created"). The agent interprets this and applies the right structural changes. Maximum 2000 characters.',
    ),
};

export class UpdateWorkflowBuilderTool extends BaseMondayApiTool<typeof updateWorkflowBuilderToolSchema> {
  name = 'update_workflow_builder';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Workflow Builder',
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
    return `Updates an existing Workflow Builder workflow draft using an AI agent.

The agent interprets the prompt and applies structural changes to the workflow — creating, updating, or deleting steps. Pass clear, descriptive instructions and the agent will decide which operations to perform, then return a summary of what it did.

Use this after create_workflow_builder to build out the workflow step by step. You can call it multiple times on the same draft to iteratively refine the workflow.

Parameters:
- workflowObjectId and workflowDraftId: both returned by create_workflow_builder — they identify which draft to update.
- prompt: describe what you want to change in plain English. Maximum 2000 characters.

Returns:
- workflowObjectId: the workflow object ID (unchanged)
- workflowDraftId: the draft version ID (unchanged)
- result: agent response describing the changes made

Note: the workflow runs only after it is published to live version.
`;
  }

  getInputSchema() {
    return updateWorkflowBuilderToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateWorkflowBuilderToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const response = await fetch(WORKFLOW_BUILDER_AGENT_URL, {
        method: 'POST',
        headers: {
          Authorization: this.apiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowObjectId: input.workflowObjectId,
          workflowDraftId: input.workflowDraftId,
          prompt: input.prompt,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`workflow-builder responded with HTTP ${response.status}${body ? `: ${body}` : ''}`);
      }

      const body = (await response.json()) as Record<string, unknown>;
      return { content: body };
    } catch (error) {
      rethrowWithContext(error, 'update workflow');
    }
  }
}
