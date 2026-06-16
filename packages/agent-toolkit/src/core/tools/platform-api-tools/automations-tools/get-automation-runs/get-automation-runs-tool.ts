import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  getTriggerEventsQuery,
  getTriggerEventQuery,
  getBlockEventsQuery,
  getToolEventsQuery,
  TriggerEventsQueryResult,
  TriggerEventQueryResult,
  BlockEventsQueryResult,
  ToolEventsQueryResult,
  TriggerEventData,
} from './automation-runs-queries';

const TOOL_DESCRIPTION = `Read the run history of monday automations/workflows. Read-only.

Set "mode":
- "history": a paginated feed of individual runs (success/failure/exhausted, duration, error reason). Filter via "filters" (dateRange, stateFilter, automationIds, workflowEntityIds, itemId, entityKind, hostType). Use "nextPageOffset" to page (offset-only: add the number of runs returned to the previous offset).
- "detail": one run by "triggerUuid" — its block steps and (for agent runs) MCP tool calls. Set "includeToolEvents": false to skip tool calls.

Required by mode: "detail" requires "triggerUuid"; omitting it is rejected. "history" requires neither "triggerUuid" nor the detail-only offsets.

Scope: pass "boardId" to target a specific board, or "accountWide": true for the whole account. At least one must be provided.

Known "stateFilter"/eventState values: "success", "failure", "exhausted" (others may appear).`;

const filtersSchema = z
  .object({
    dateRange: z
      .object({
        startDate: z.string().min(1).describe('Start date (ISO 8601 or date-only, e.g. "2026-05-01")'),
        endDate: z.string().min(1).describe('End date (ISO 8601 or date-only)'),
      })
      .optional()
      .describe('Date range filter'),
    stateFilter: z.array(z.string()).optional().describe('Filter by event state (e.g. ["success", "failure"])'),
    automationIds: z.array(z.number().int()).optional().describe('Filter by automation IDs'),
    workflowEntityIds: z.array(z.number().int()).optional().describe('Filter by workflow entity IDs'),
    itemId: z.string().optional().describe('Filter by item identifier'),
    entityKind: z.string().optional().describe('Filter by entity kind'),
    hostType: z.string().optional().describe('Filter by host type'),
  })
  .optional();

export const getAutomationRunsToolSchema = {
  mode: z.enum(['history', 'detail']).describe('history = paginated run feed; detail = single run by triggerUuid'),
  boardId: z.string().min(1).optional().describe('Target a specific board by numeric ID'),
  accountWide: z.boolean().optional().describe('Set true to query account-wide (required if no boardId)'),
  nextPageOffset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('history: page offset (offset-only pagination)'),
  filters: filtersSchema.describe('history: run filters'),
  triggerUuid: z.string().optional().describe('detail: required — the run UUID to inspect'),
  includeToolEvents: z.boolean().optional().describe('detail: include MCP tool calls (default true)'),
  blockEventsOffset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('detail: block-events page offset'),
  toolEventsOffset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('detail: tool-events page offset'),
};

export class GetAutomationRunsTool extends BaseMondayApiTool<typeof getAutomationRunsToolSchema> {
  name = 'get_automation_runs';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Automation Runs',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return TOOL_DESCRIPTION;
  }

  getInputSchema() {
    return getAutomationRunsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getAutomationRunsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.boardId && !input.accountWide) {
      return {
        content: { message: 'Either "boardId" or "accountWide": true must be provided.' },
      };
    }

    try {
      if (input.mode === 'detail') {
        return await this.runDetail(input);
      }
      return await this.runHistory(input);
    } catch (error) {
      rethrowWithContext(error, 'get automation runs');
    }
  }

  private async runHistory(
    input: ToolInputType<typeof getAutomationRunsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const offset = input.nextPageOffset ?? 0;
    const filters = {
      ...(input.filters ?? {}),
      ...(input.boardId ? { boardId: input.boardId } : {}),
    };

    const res = await this.mondayApi.request<TriggerEventsQueryResult>(getTriggerEventsQuery, {
      nextPageOffset: offset,
      filters,
    });

    const runs = res.trigger_events?.triggerEvents ?? [];
    const stateCounts = countByState(runs);
    const scope = input.boardId ? `board ${input.boardId}` : 'account-wide';
    const message =
      `Returned ${runs.length} run(s) (${scope}) at offset ${offset}. ` +
      `By state: ${formatCounts(stateCounts)}. ` +
      `Offset-only pagination — for the next page request offset ${offset + runs.length}.`;

    return {
      content: { message, scope, offset, count: runs.length, stateCounts, runs },
    };
  }

  private async runDetail(
    input: ToolInputType<typeof getAutomationRunsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.triggerUuid) {
      return {
        content: { message: 'detail mode requires "triggerUuid".' },
      };
    }

    const includeTools = input.includeToolEvents !== false;
    const blockEventsOffset = input.blockEventsOffset ?? 0;
    const toolEventsOffset = input.toolEventsOffset ?? 0;

    const runRes = await this.mondayApi.request<TriggerEventQueryResult>(getTriggerEventQuery, {
      triggerUuid: input.triggerUuid,
    });

    const run = runRes.trigger_event;
    if (!run) {
      return {
        content: { message: `No run found for triggerUuid ${input.triggerUuid}.`, triggerUuid: input.triggerUuid, found: false },
      };
    }

    const [blockRes, toolRes] = await Promise.all([
      this.mondayApi.request<BlockEventsQueryResult>(getBlockEventsQuery, {
        triggerUuid: input.triggerUuid,
        nextPageOffset: blockEventsOffset,
      }),
      includeTools
        ? this.mondayApi.request<ToolEventsQueryResult>(getToolEventsQuery, {
            trigger_uuid: input.triggerUuid,
            next_page_offset: toolEventsOffset,
          })
        : Promise.resolve(null),
    ]);

    const blockEvents = blockRes.block_events?.blockEvents ?? [];
    const toolEvents = toolRes?.tool_events?.tool_events ?? [];
    const message =
      `Run ${input.triggerUuid}: state=${run.eventState ?? 'unknown'}, ` +
      `${blockEvents.length} block step(s), ${toolEvents.length} tool call(s).`;

    return {
      content: {
        message,
        found: true,
        run,
        blockEvents,
        blockEventsOffset,
        toolEvents,
        toolEventsOffset,
        toolEventsIncluded: includeTools,
      },
    };
  }
}

function countByState(runs: TriggerEventData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    const key = run.eventState ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  return entries.length ? entries.map(([state, n]) => `${state}=${n}`).join(', ') : 'none';
}
