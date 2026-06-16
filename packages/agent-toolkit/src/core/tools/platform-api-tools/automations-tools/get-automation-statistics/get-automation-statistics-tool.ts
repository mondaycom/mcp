import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  getAccountTriggerStatisticsQuery,
  getAccountTriggersByEntityQuery,
  AccountTriggerStatisticsQueryResult,
  AccountTriggersByEntityQueryResult,
} from './automation-statistics-queries';

const TOOL_DESCRIPTION = `Aggregate statistics for monday automation runs. Read-only.

Set "breakdown":
- "totals": account/board-level counts { success, failure, total }.
- "by_entity": per-automation and per-workflow breakdown for a given "runStatus" ("success" | "failure" | "exhausted", required). "excludeAutomationIds" omits specific automations from the breakdown (exclusion list).

Required by breakdown: "by_entity" requires "runStatus"; omitting it is rejected. "totals" requires neither "runStatus" nor "excludeAutomationIds".

Optional "userIds" narrows to specific creators.

Scope: pass "boardId" to target a specific board, or "accountWide": true for the whole account. At least one must be provided.`;

export const getAutomationStatisticsToolSchema = {
  breakdown: z
    .enum(['totals', 'by_entity'])
    .describe('totals = success/failure/total counts; by_entity = per automation/workflow'),
  boardId: z.string().min(1).optional().describe('Target a specific board by numeric ID'),
  accountWide: z.boolean().optional().describe('Set true to query account-wide (required if no boardId)'),
  userIds: z.array(z.number().int()).optional().describe('Narrow to specific creator user IDs'),
  runStatus: z
    .enum(['success', 'failure', 'exhausted'])
    .optional()
    .describe('by_entity: required run status to break down'),
  excludeAutomationIds: z
    .array(z.number().int())
    .optional()
    .describe('by_entity: automation IDs to exclude from breakdown'),
};

export class GetAutomationStatisticsTool extends BaseMondayApiTool<typeof getAutomationStatisticsToolSchema> {
  name = 'get_automation_statistics';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Automation Statistics',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return TOOL_DESCRIPTION;
  }

  getInputSchema() {
    return getAutomationStatisticsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getAutomationStatisticsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.boardId && !input.accountWide) {
      return {
        content: { message: 'Either "boardId" or "accountWide": true must be provided.' },
      };
    }

    try {
      if (input.breakdown === 'by_entity') {
        return await this.runByEntity(input);
      }
      return await this.runTotals(input);
    } catch (error) {
      rethrowWithContext(error, 'get automation statistics');
    }
  }

  private async runTotals(
    input: ToolInputType<typeof getAutomationStatisticsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const boardIdInt = input.boardId ? toBoardIdInt(input.boardId) : undefined;

    const res = await this.mondayApi.request<AccountTriggerStatisticsQueryResult>(
      getAccountTriggerStatisticsQuery,
      { filters: { board_id: boardIdInt, user_ids: input.userIds } },
    );

    const stats = res.account_trigger_statistics;
    const scope = input.boardId ? `board ${input.boardId}` : 'account-wide';
    const message = `Totals (${scope}): success=${stats?.success ?? 0}, failure=${stats?.failure ?? 0}, total=${stats?.total ?? 0}.`;

    return {
      content: { message, scope, breakdown: 'totals', statistics: stats },
    };
  }

  private async runByEntity(
    input: ToolInputType<typeof getAutomationStatisticsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.runStatus) {
      return {
        content: { message: 'by_entity breakdown requires "runStatus" (success | failure | exhausted).' },
      };
    }

    const boardIdInt = input.boardId ? toBoardIdInt(input.boardId) : undefined;

    const res = await this.mondayApi.request<AccountTriggersByEntityQueryResult>(
      getAccountTriggersByEntityQuery,
      {
        runStatus: input.runStatus,
        filters: {
          board_id: boardIdInt,
          automation_ids: input.excludeAutomationIds,
          user_ids: input.userIds,
        },
      },
    );

    const stats = res.account_triggers_statistics_by_entity_id;
    const scope = input.boardId ? `board ${input.boardId}` : 'account-wide';
    const message = `By-entity '${input.runStatus}' statistics (${scope}).`;

    return {
      content: {
        message,
        scope,
        breakdown: 'by_entity',
        runStatus: input.runStatus,
        automationStatistics: stats?.automation_statistics,
        workflowStatistics: stats?.workflow_statistics,
      },
    };
  }
}

function toBoardIdInt(boardId: string): number {
  const parsed = Number(boardId.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid boardId: '${boardId}' is not a positive integer.`);
  }
  return parsed;
}
