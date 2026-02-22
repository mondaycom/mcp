import { z } from 'zod';
import {
  GetBoardDataQuery,
  GetBoardDataQueryVariables,
  GetUsersByIdsQuery,
  GetUsersByIdsQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getBoardDataQuery, getUsersByIdsQuery } from './full-board-data.graphql';
import { DEFAULT_ITEMS_LIMIT } from './full-board-data.consts';
import { User, PeopleEntity, PeopleValue } from './full-board-data.types';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import { filterRulesSchema, filtersOperatorSchema } from '../get-board-items-page-tool/items-filter-schema';

export const fullBoardDataToolSchema = {
  boardId: z.number().describe('The ID of the board to fetch complete data for'),
  filters: filterRulesSchema,
  filtersOperator: filtersOperatorSchema,
};
export type FullBoardDataToolSchema = typeof fullBoardDataToolSchema;

export class FullBoardDataTool extends BaseMondayApiTool<typeof fullBoardDataToolSchema> {
  name = 'get_full_board_data';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Full Board Data',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `INTERNAL USE ONLY - DO NOT CALL THIS TOOL DIRECTLY. This tool is exclusively triggered by UI components and should never be invoked directly by the agent.`;
  }

  getInputSchema(): typeof fullBoardDataToolSchema {
    return fullBoardDataToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof fullBoardDataToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      // Step 1: Fetch board data with items and updates
      const variables: GetBoardDataQueryVariables = {
        boardId: input.boardId.toString(),
        itemsLimit: DEFAULT_ITEMS_LIMIT,
      };

      // Add query params if filters are provided
      if (input.filters) {
        variables.queryParams = {
          operator: input.filtersOperator,
          rules: input.filters.map((rule) => ({
            column_id: rule.columnId.toString(),
            compare_value: rule.compareValue,
            operator: rule.operator,
            compare_attribute: rule.compareAttribute,
          })),
        };
      }

      const boardData = await this.mondayApi.request<GetBoardDataQuery>(getBoardDataQuery, variables);

      if (!boardData.boards || boardData.boards.length === 0 || !boardData.boards[0]) {
        throw new Error(`Board with ID ${input.boardId} not found`);
      }

      const board = boardData.boards[0];

      // Step 2: Extract unique user IDs from updates and people column values
      const userIds = new Set<string>();

      board.items_page.items.forEach((item) => {
        // Collect IDs from update creators and reply creators
        item.updates?.forEach((update) => {
          if (update.creator_id) {
            userIds.add(update.creator_id);
          }
          // Collect IDs from reply creators
          update.replies?.forEach((reply) => {
            if (reply.creator_id) {
              userIds.add(reply.creator_id);
            }
          });
        });

        // Collect IDs from people column values
        item.column_values.forEach((columnValue) => {
          // Check if this column value has persons_and_teams property (only PeopleValue has this)
          if ('persons_and_teams' in columnValue) {
            const peopleColumn = columnValue as PeopleValue;
            peopleColumn.persons_and_teams?.forEach((personOrTeam: PeopleEntity) => {
              if (personOrTeam.kind === 'person' && personOrTeam.id) {
                userIds.add(personOrTeam.id);
              }
            });
          }
        });
      });

      // Step 3: Fetch user details for all collected user IDs (if any exist)
      let users: User[] = [];
      if (userIds.size > 0) {
        const userIdsList = Array.from(userIds);
        const userVariables: GetUsersByIdsQueryVariables = {
          userIds: userIdsList,
        };
        const usersData = await this.mondayApi.request<GetUsersByIdsQuery>(getUsersByIdsQuery, userVariables);
        users = usersData.users?.filter((u): u is User => u !== null) || [];
      }

      // Step 4: Create a user lookup map
      const userMap = new Map(users.map((user) => [user.id, user]));

      // Step 5: Return comprehensive data
      const result = {
        board: {
          id: board.id,
          name: board.name,
          columns: board.columns,
          items: board.items_page.items.map((item) => ({
            id: item.id,
            name: item.name,
            column_values: item.column_values,
            updates:
              item.updates?.map((update) => ({
                id: update.id,
                creator_id: update.creator_id || '',
                creator: update.creator_id ? userMap.get(update.creator_id) || null : null,
                text_body: update.text_body,
                created_at: update.created_at,
                replies:
                  update.replies?.map((reply) => ({
                    id: reply.id,
                    creator_id: reply.creator_id || '',
                    creator: reply.creator_id ? userMap.get(reply.creator_id) || null : null,
                    text_body: reply.text_body,
                    created_at: reply.created_at,
                  })) || [],
              })) || [],
          })),
        },
        users: users,
        stats: {
          total_items: board.items_page.items.length,
          total_updates: board.items_page.items.reduce((sum, item) => sum + (item.updates?.length || 0), 0),
          total_unique_creators: users.length,
        },
      };

      return {
        content: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      rethrowWithContext(error, 'get full board data');
    }
  }
}
