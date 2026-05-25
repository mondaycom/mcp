import { ApiClient } from '@mondaydotcomorg/api';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, MondayApiToolContext, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

const WORKFLOW_BUILDER_AGENT_URL = 'https://api.monday.com/platform-ai-gateway/agents/workflow-builder';
const REQUEST_TIMEOUT_MS = 180_000;

export const updateWorkflowBuilderToolSchema = {
  workflowObjectId: z.number().describe('The stable workflow entity ID (workflow_object_id returned by create_workflow_builder).'),
  workflowDraftId: z.number().describe('The draft workflow ID to update (workflow_draft_id returned by create_workflow_builder).'),
  prompt: z
    .string()
    .trim()
    .min(1, 'prompt must be a non-empty string')
    .describe('Natural-language description of the changes to make to the workflow (e.g. "add a step that sends an email when an item is created").'),
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
    return `Updates an existing Workflow Builder workflow from a natural-language description.

Use when the user wants to modify a workflow — add steps, remove steps, change triggers or conditions, etc. Requires the workflowObjectId and workflowDraftId from a previous create_workflow_builder call (or from list_workflows).

Returns:
- workflowObjectId: the workflow entity ID
- workflowDraftId: the updated draft ID
- result: agent response describing the changes made
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
