import { z } from 'zod';
import {
  GetBoardAllActivityQuery,
  GetBoardAllActivityQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getBoardAllActivity } from './get-board-activity.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './../base-monday-api-tool';
import { TIME_IN_MILLISECONDS } from '../../../../utils';

export const getBoardActivityToolSchema = {
  boardId: z.number().describe('The id of the board to get activity for'),
  fromDate: z
    .string()
    .optional()
    .describe('Start date for activity range (ISO8601DateTime format). Defaults to 30 days ago'),
  toDate: z.string().optional().describe('End date for activity range (ISO8601DateTime format). Defaults to now'),
  includeData: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Whether to include the raw data payload for each activity entry. The data field contains the full before/after state of changes and can be very large. Only set to true when you need the detailed change data.',
    ),
};

export class GetBoardActivityTool extends BaseMondayApiTool<typeof getBoardActivityToolSchema | undefined> {
  name = 'get_board_activity';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Board Activity',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  private defaultLimit = 1000;

  getDescription(): string {
    return 'Get board activity logs for a specified time range (defaults to last 30 days)';
  }

  getInputSchema(): typeof getBoardActivityToolSchema {
    return getBoardActivityToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getBoardActivityToolSchema>,
  ): Promise<ToolOutputType<never>> {
    // Calculate default date range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - TIME_IN_MILLISECONDS.MONTH30Days);

    const fromDate = input?.fromDate || thirtyDaysAgo.toISOString();
    const toDate = input?.toDate || now.toISOString();

    const variables: GetBoardAllActivityQueryVariables = {
      boardId: input.boardId.toString(),
      fromDate,
      toDate,
      limit: this.defaultLimit,
      page: 1,
      includeData: input.includeData ?? false,
    };

    const res = await this.mondayApi.request<GetBoardAllActivityQuery>(getBoardAllActivity, variables);

    const activityLogs = res.boards?.[0]?.activity_logs;

    if (!activityLogs || activityLogs.length === 0) {
      return {
        content: `No activity found for board ${input.boardId} in the specified time range (${fromDate} to ${toDate}).`,
      };
    }

    const board = res.boards?.[0];
    const includeData = input.includeData ?? false;

    return {
      content: {
        message: "Board activity retrieved",
        board_id: input.boardId,
        board_name: board?.name,
        board_url: board?.url,
        data: activityLogs
          .filter((log): log is NonNullable<typeof log> => log !== null && log !== undefined)
          .map((log) => ({
            created_at: log.created_at,
            event: log.event,
            entity: log.entity,
            user_id: log.user_id,
            ...(includeData && log.data ? { data: log.data } : {}),
          })),
      },
    };
  }
}
