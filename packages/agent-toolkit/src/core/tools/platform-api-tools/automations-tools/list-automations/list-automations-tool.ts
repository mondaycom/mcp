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

const ENTITY_TYPE = 'board_automation';

type AutomationOutput = Omit<BoardAutomation, 'active' | 'user_id'> & {
  readonly entity_type: typeof ENTITY_TYPE;
  readonly editable: true;
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
  if (typeof legacy === 'object' && !Array.isArray(legacy)) {
    return { entity_type: ENTITY_TYPE, editable: false, ...legacy };
  }
  return legacy;
}

function mapBoardAutomation(automation: BoardAutomation): AutomationOutput {
  const { active, user_id: userId, ...rest } = automation;

  return {
    entity_type: ENTITY_TYPE,
    editable: true,
    ...rest,
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
Returns two groups: "automations" (editable: true, supports pagination via limit/cursor) and "legacyAutomations" (editable: false, automations set up in an older way, returned on the first page only, when no cursor is given).
Always present BOTH groups to the user together as one list of board automations. Never omit or hide "legacyAutomations".
Legacy automations are read-only here. When the user asks to activate, deactivate, delete or change one, tell them it can't be changed by the agent and that they can change it themselves in monday.com.
Call this FIRST before manage_automations. It is the only way to resolve an automation id from a name or description. Never guess an automation id.
Automation ids are not workflow-builder workflow ids. Never pass them to workflow tools.
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

      const automations = (res.board_automations?.items ?? []).map(mapBoardAutomation);
      const nextCursor = res.board_automations?.cursor ?? null;
      // legacy_automations is best-effort on the provider: on failure it returns an { error }
      // marker rather than throwing. Drop that so the model never renders an error as an
      // automation — the field is already optional ("present both groups" applies to real data).
      const legacyAutomations = includeLegacy
        ? extractLegacyAutomations(res.board_automations?.legacy_automations)
        : null;

      return {
        content: {
          message: `Found ${automations.length} automation(s) on board ${input.boardId}`,
          automations,
          ...(legacyAutomations != null ? { legacyAutomations } : {}),
          pagination: {
            nextCursor,
            hasMore: nextCursor !== null,
          },
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list automations');
    }
  }
}
