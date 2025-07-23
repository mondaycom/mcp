import { z } from 'zod';
import { GetBoardAllActivityQuery, GetBoardAllActivityQueryVariables } from '../../../monday-graphql/generated/graphql';
import { getBoardAllActivity } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const getBoardActivityToolSchema = {
  boardId: z.number().describe('The id of the board to get activity for'),
  fromDate: z.string().optional().describe('Start date for activity range (ISO8601DateTime format). Defaults to 30 days ago'),
  toDate: z.string().optional().describe('End date for activity range (ISO8601DateTime format). Defaults to now'),
  limit: z.number().optional().describe('Maximum number of activity logs to return. Defaults to 1000'),
  page: z.number().optional().describe('Page number for pagination. Defaults to 1'),
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

  getDescription(): string {
    return 'Get board activity logs for a specified time range (defaults to last 30 days)';
  }

  getInputSchema(): typeof getBoardActivityToolSchema | undefined {
    if (this.context?.boardId) {
      return undefined;
    }

    return getBoardActivityToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getBoardActivityToolSchema | undefined>,
  ): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof getBoardActivityToolSchema>).boardId;
    
    // Calculate default date range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const fromDate = (input as any)?.fromDate || thirtyDaysAgo.toISOString();
    const toDate = (input as any)?.toDate || now.toISOString();
    const limit = (input as any)?.limit || 1000;
    const page = (input as any)?.page || 1;

    const variables: GetBoardAllActivityQueryVariables = {
      boardId: boardId.toString(),
      fromDate,
      toDate,
      limit,
      page,
    };

    const res = await this.mondayApi.request<GetBoardAllActivityQuery>(getBoardAllActivity, variables);

    const activityLogs = res.boards?.[0]?.activity_logs;
    
    if (!activityLogs || activityLogs.length === 0) {
      return {
        content: `No activity found for board ${boardId} in the specified time range (${fromDate} to ${toDate}).`,
      };
    }

    const formattedActivity = activityLogs
      .filter((log): log is NonNullable<typeof log> => log !== null && log !== undefined)
      .map((log) => {
        return `• ${log.created_at}: ${log.event} on ${log.entity} by user ${log.user_id}${log.data ? ` - Data: ${log.data}` : ''}`;
      })
      .join('\n');

    return {
      content: `Activity logs for board ${boardId} from ${fromDate} to ${toDate} (${activityLogs.length} entries):

${formattedActivity}`,
    };
  }
} 