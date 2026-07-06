import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  BoardAutomation,
  BoardAutomationsQuery,
  BoardAutomationsQueryVariables,
  getBoardAutomationsQuery,
} from './board-automations-query';

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

// The provider's legacy fetch is best-effort: it yields an `{ error }` marker instead of
// throwing when the internal endpoint fails. Surface real data only; treat the marker as absent.
function extractLegacyAutomations(legacy: unknown): unknown {
  if (legacy == null) {
    return null;
  }
  if (typeof legacy === 'object' && 'error' in legacy) {
    return null;
  }
  return legacy;
}

function mapBoardAutomationToWorkflow(automation: BoardAutomation): WorkflowOutput {
  const { active, user_id: userId, ...workflow } = automation;

  return {
    ...workflow,
    user_id: normalizeUserId(userId),
    is_active: active ?? false,
  };
}

export const listAutomationsToolSchema = {
  boardId: z.string().trim().min(1, 'boardId must be a non-empty string').describe('The numeric board ID as a string.'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum number of automations to return. Default: 100.'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor from a previous response. Pass to retrieve the next page of automations.'),
};

export class ListAutomationsTool extends BaseMondayApiTool<typeof listAutomationsToolSchema> {
  name = 'list_automations';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Board Automations',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `List all automations on a specific monday.com board, including their ids, titles, active state, and configuration.
Returns two groups: "workflows" (fully manageable, supports pagination via limit/cursor) and "legacyAutomations" (READ-ONLY automations set up in an older way — returned on the first page only, when no cursor is given).
Always present BOTH groups to the user together as one list of board automations — never omit or hide "legacyAutomations". The split and the read-only limitation are internal context for you only: don't volunteer them and don't label any automation "legacy" or "read-only". Only if the user asks to act on a legacy one, briefly explain it can't be changed (e.g. "This one was set up in an older way and can't be modified here").
When NOT to use: Do not call this tool to get general board information unrelated to automations.
`;
  }

  getInputSchema() {
    return listAutomationsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listAutomationsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      // Legacy automations are board-scoped and only meaningful on the first page (no cursor).
      const includeLegacy = !input.cursor;
      const variables: BoardAutomationsQueryVariables = {
        boardIds: [input.boardId],
        limit: input.limit ?? DEFAULT_LIMIT,
        includeLegacy,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      };

      const res = await this.mondayApi.request<BoardAutomationsQuery>(getBoardAutomationsQuery, variables);

      const workflows = (res.board_automations?.items ?? []).map(mapBoardAutomationToWorkflow);
      const nextCursor = res.board_automations?.cursor ?? null;
      // legacy_automations is best-effort on the provider: on failure it returns an { error }
      // marker rather than throwing. Drop that so the model never renders an error as an
      // automation — the field is already optional ("present both groups" applies to real data).
      const legacyAutomations = includeLegacy
        ? extractLegacyAutomations(res.board_automations?.legacy_automations)
        : null;

      return {
        content: {
          message: `Found ${workflows.length} live workflow(s) on board ${input.boardId}`,
          workflows,
          ...(legacyAutomations != null ? { legacyAutomations } : {}),
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
