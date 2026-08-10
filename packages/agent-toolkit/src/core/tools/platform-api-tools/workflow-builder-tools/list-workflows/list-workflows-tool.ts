import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  LiveWorkflowAutomationsPage,
  WorkflowAutomationsPaginationInput,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { MAX_LIVE_WORKFLOWS_PAGE_SIZE } from '../constants';
import { toWorkflowReadModel } from '../workflow-read-model';
import { listWorkflowsQuery } from './list-workflows.graphql.dev';

interface ListWorkflowsQueryResponse {
  readonly live_workflows_page: LiveWorkflowAutomationsPage | null;
}

export const listWorkflowsToolSchema = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIVE_WORKFLOWS_PAGE_SIZE)
    .optional()
    .describe(`Maximum number of workflows to return (max ${MAX_LIVE_WORKFLOWS_PAGE_SIZE}). Defaults to 50.`),
  cursor: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Pagination cursor from a previous response (page_info.end_cursor). Pass to retrieve the next page.'),
};

export class ListWorkflowsTool extends BaseMondayApiTool<typeof listWorkflowsToolSchema> {
  name = 'list_workflows';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Live Workflows',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `List the requesting account's live (published) workflows, with cursor-based pagination.

Use this to discover standalone, workspace-level workflows. Workflows are cross-board, workspace-level objects, distinct from board automations (use list_automations for those). Use get_workflow to read a specific workflow's full definition by ID.

Returns a "workflows" array (each entry has: id, title, description, active, created_at, updated_at, steps) and "pagination" with { nextCursor, hasMore }. To page, pass the returned nextCursor back as "cursor".
`;
  }

  getInputSchema() {
    return listWorkflowsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof listWorkflowsToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const pagination: WorkflowAutomationsPaginationInput = {
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(input.cursor !== undefined ? { last_id: input.cursor } : {}),
      };

      const res = await this.mondayApi.request<ListWorkflowsQueryResponse>(
        listWorkflowsQuery,
        { pagination },
        { versionOverride: 'dev' },
      );

      const page = res.live_workflows_page;
      const workflows = (page?.data ?? []).map(toWorkflowReadModel);
      const nextCursor = page?.page_info?.end_cursor ?? null;
      const hasMore = page?.page_info?.has_next_page ?? false;

      return {
        content: {
          message: `Found ${workflows.length} live workflow(s)`,
          workflows,
          pagination: {
            nextCursor,
            hasMore,
          },
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list live workflows');
    }
  }
}
