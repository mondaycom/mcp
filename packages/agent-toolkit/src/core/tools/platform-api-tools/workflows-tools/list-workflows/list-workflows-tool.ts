import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  BoardAutomation,
  BoardAutomationsQuery,
  BoardAutomationsQueryVariables,
  getBoardAutomationsQuery,
} from './board-automations.graphql.dev';

const DEFAULT_LIMIT = 100;

type WorkflowOutput = Omit<BoardAutomation, 'active' | 'user_id'> & {
  readonly user_id: BoardAutomation['user_id'];
  readonly is_active: boolean;
};

function normalizeUserId(userId: BoardAutomation['user_id']): BoardAutomation['user_id'] {
  if (typeof userId !== 'string') {
    return userId;
  }

  const parsedUserId = Number(userId);
  return Number.isNaN(parsedUserId) ? userId : parsedUserId;
}

function mapBoardAutomationToWorkflow(automation: BoardAutomation): WorkflowOutput {
  const { active, user_id: userId, ...workflow } = automation;

  return {
    ...workflow,
    user_id: normalizeUserId(userId),
    is_active: active ?? false,
  };
}

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
      const variables: BoardAutomationsQueryVariables = {
        boardIds: [input.boardId],
        limit: input.limit ?? DEFAULT_LIMIT,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      };

      const res = await this.mondayApi.request<BoardAutomationsQuery>(getBoardAutomationsQuery, variables, {
        versionOverride: '2026-10',
      });

      const workflows = (res.board_automations?.items ?? []).map(mapBoardAutomationToWorkflow);
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
