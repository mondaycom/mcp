import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import { WorkflowAutomation } from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { MAX_WORKFLOWS_PER_QUERY } from '../constants';
import { toWorkflowReadModel } from '../workflow-read-model';
import { getWorkflowsQuery } from './get-workflow.graphql.dev';

interface GetWorkflowsQueryResponse {
  readonly workflows: WorkflowAutomation[] | null;
}

export const getWorkflowToolSchema = {
  workflowIds: z
    .array(z.string().trim().min(1, 'workflowId must be a non-empty string'))
    .min(1, 'Provide at least one workflow ID')
    .max(MAX_WORKFLOWS_PER_QUERY, `Cannot request more than ${MAX_WORKFLOWS_PER_QUERY} workflows per call`)
    .describe(`The workflow object IDs to fetch, as strings (1..${MAX_WORKFLOWS_PER_QUERY}).`),
};

export class GetWorkflowTool extends BaseMondayApiTool<typeof getWorkflowToolSchema> {
  name = 'get_workflow';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Workflow',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Read one or more live workflows by their workflow object ID, returning metadata and the ordered list of steps.

Use this to inspect a standalone, workspace-level workflow's definition — its title, description, active state, and steps. Workflows are cross-board, workspace-level objects, distinct from board automations (use list_automations for those).

Returns a "workflows" array where each entry has id, title, description, active, created_at, updated_at, and steps (each step has node_id, block_reference_id, and title). IDs that don't resolve to a workflow are omitted from the result.

Note: if directing the user to a workflow in the UI, the correct URL path is custom_objects/ — e.g. {account}.monday.com/custom_objects/{id}.
`;
  }

  getInputSchema() {
    return getWorkflowToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getWorkflowToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const res = await this.mondayApi.request<GetWorkflowsQueryResponse>(
        getWorkflowsQuery,
        { ids: input.workflowIds },
        { versionOverride: 'dev' },
      );

      const workflows = (res.workflows ?? []).map(toWorkflowReadModel);

      return {
        content: {
          message: `Found ${workflows.length} workflow(s) for ${input.workflowIds.length} requested ID(s)`,
          workflows,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'get workflow');
    }
  }
}
