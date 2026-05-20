import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  getBoardAutomationsQuery,
  GetBoardAutomationsQuery,
  GetBoardAutomationsQueryVariables,
} from './board-automations';

const DEFAULT_LIMIT = 100;

export const listWorkflowsToolSchema = {
  boardId: z.string().trim().min(1, 'boardId must be a non-empty string').describe('The numeric board ID as a string.'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum number of workflows to return. Default: 100.'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from a previous response. Pass to retrieve the next page of workflows.'),
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
    return `List all automations (workflows) on a monday.com board, including their ids, titles, active state, and configuration.

When NOT to use: Do not call this tool to get general board information unrelated to workflows.

Terminology: "workflows" and "automations" are the same thing.`;
  }

  getInputSchema() {
    return listWorkflowsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listWorkflowsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: GetBoardAutomationsQueryVariables = {
        board_ids: [input.boardId],
        limit: input.limit ?? DEFAULT_LIMIT,
        cursor: input.cursor || undefined,
      };

      const res = await this.mondayApi.request<GetBoardAutomationsQuery>(getBoardAutomationsQuery, variables, {
        versionOverride: '2026-10',
      });

      const workflows = res.board_automations?.items ?? [];
      const nextCursor = res.board_automations?.cursor ?? null;

      return {
        content: {
          message: `Found ${workflows.length} live workflow(s) on board ${input.boardId}`,
          workflows,
          pagination: {
            nextCursor,
            hasMore: nextCursor !== null,
          },
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list live workflows');
    }
  }
}
