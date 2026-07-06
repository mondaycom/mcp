import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import { PLATFORM_AGENT_SERVICE_NAME, resolveMondayFetch, WORKFLOW_BUILDER_AGENT_PATH } from '../../ai-agent.utils';

const REQUEST_TIMEOUT_MS = 180_000;

export const updateWorkflowToolSchema = {
  workflowObjectId: z
    .number()
    .describe(
      'The workflow object ID returned by create_workflow. Identifies the workflow across all its drafts and published versions. Does not change across publishes.',
    ),
  workflowDraftId: z
    .number()
    .describe(
      'The draft version ID to update. Use the workflowDraftId from the previous create_workflow or update_workflow response — the agent may return a new draft ID, so always read it from the latest response rather than reusing an earlier value.',
    ),
  prompt: z
    .string()
    .trim()
    .min(1, 'prompt must be a non-empty string')
    .max(2000, 'prompt must not exceed 2000 characters')
    .describe(
      'Natural-language description of the changes to make. Describe what steps to add, remove, or modify in plain English (e.g. "Add a trigger that fires when an item is created on the Marketing board"). The agent interprets this and applies the right structural changes. Maximum 2000 characters.',
    ),
};

export class UpdateWorkflowTool extends BaseMondayApiTool<typeof updateWorkflowToolSchema> {
  name = 'update_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Workflow',
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
    return `Updates an existing workflow draft using an AI agent.

The agent interprets the prompt and applies structural changes to the workflow — creating, updating, or deleting steps. Pass clear, descriptive instructions and the agent will decide which operations to perform, then return a summary of what it did.

Use this after create_workflow to build out the workflow step by step. You can call it multiple times on the same draft to iteratively refine the workflow.

Parameters:
- workflowObjectId and workflowDraftId: both returned by create_workflow — they identify which draft to update.
- prompt: describe what you want to change in plain English (e.g. "Add a trigger that fires when an item is created on the Marketing board"). Maximum 2000 characters.

Returns:
- workflowObjectId: the workflow object ID (unchanged)
- workflowDraftId: the draft version ID (unchanged)
- result: agent response describing the changes made

Note: if directing the user to the workflow in the UI, the correct URL path is custom_objects/, not workflows/ — e.g. {account}.monday.com/custom_objects/{workflowObjectId}.

Note: the workflow runs only after it is published to live version.
`;
  }

  getInputSchema() {
    return updateWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof updateWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const apiToken = typeof this.apiToken === 'function' ? this.apiToken() : this.apiToken;
      const mondayFetch = resolveMondayFetch(this.context);
      const response = await mondayFetch({
        serviceName: PLATFORM_AGENT_SERVICE_NAME,
        path: WORKFLOW_BUILDER_AGENT_PATH,
        method: 'POST',
        headers: {
          ...(this.context?.fetchConfig?.fetch ? {} : { Authorization: apiToken }),
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
