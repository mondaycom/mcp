import { gql } from 'graphql-request';
import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

const publishWorkflowMutation = gql`
  mutation publishWorkflow($workflow_object_id: ID!, $workflow_draft_id: ID!, $should_activate: Boolean) {
    publish_workflow(
      workflow_object_id: $workflow_object_id
      workflow_draft_id: $workflow_draft_id
      should_activate: $should_activate
    ) {
      workflow_object_id
      workflow_live_id
    }
  }
`;

type PublishWorkflowMutationVariables = {
  workflow_object_id: string;
  workflow_draft_id: string;
  should_activate?: boolean;
};

type PublishWorkflowMutation = {
  publish_workflow: {
    workflow_object_id: string;
    workflow_live_id: string;
  };
};

export const publishWorkflowToolSchema = {
  workflowObjectId: z
    .string()
    .trim()
    .min(1, 'workflowObjectId must be a non-empty string')
    .describe('The workflow object ID returned by create_workflow. Identifies the workflow across all its drafts and live versions.'),
  workflowDraftId: z
    .string()
    .trim()
    .min(1, 'workflowDraftId must be a non-empty string')
    .describe(
      'The draft version ID returned by create_workflow. Both workflowObjectId and workflowDraftId are required — together they identify the exact draft to publish.',
    ),
  shouldActivate: z
    .boolean()
    .optional()
    .describe(
      'Whether to activate the workflow immediately after publishing so it starts running. Defaults to false — the workflow is published but stays inactive.',
    ),
};

export class PublishWorkflowTool extends BaseMondayApiTool<typeof publishWorkflowToolSchema> {
  name = 'publish_workflow';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Publish Workflow',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Publishes a workflow draft, promoting it to the live version.

Use this after create_workflow (and optionally update_workflow) to make the workflow active. Before publishing, the workflow is validated — if it has missing or misconfigured steps, publish will fail with a validation error describing what needs to be fixed.

Parameters:
- workflowObjectId and workflowDraftId: both returned by create_workflow — they identify which draft to publish.
- shouldActivate: set to true to start running the workflow immediately after publish. Defaults to false (published but inactive).

Returns:
- workflowObjectId: the workflow object ID (unchanged)
- workflowLiveId: the new live version ID — this changes on every publish, so do not cache it

Note: a new draft is created after each publish. To make further changes, call update_workflow with the new draft ID.
`;
  }

  getInputSchema() {
    return publishWorkflowToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof publishWorkflowToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: PublishWorkflowMutationVariables = {
        workflow_object_id: input.workflowObjectId,
        workflow_draft_id: input.workflowDraftId,
        ...(input.shouldActivate !== undefined ? { should_activate: input.shouldActivate } : {}),
      };

      const res = await this.mondayApi.request<PublishWorkflowMutation>(publishWorkflowMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.publish_workflow) {
        throw new Error('publish_workflow returned null');
      }

      const { workflow_object_id, workflow_live_id } = res.publish_workflow;

      if (!workflow_object_id || !workflow_live_id) {
        throw new Error('publish_workflow returned missing identifiers');
      }

      return {
        content: {
          message: `Workflow ${input.workflowObjectId} published successfully`,
          workflowObjectId: workflow_object_id,
          workflowLiveId: workflow_live_id,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'publish workflow');
    }
  }
}
