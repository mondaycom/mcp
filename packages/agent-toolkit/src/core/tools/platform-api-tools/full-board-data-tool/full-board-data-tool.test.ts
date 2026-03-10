import { z } from 'zod';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { ColumnType } from '../../../../monday-graphql/generated/graphql/graphql';
import { ZodTypeAny } from 'zod';
import { FullBoardDataToolSchema } from './full-board-data-tool';
import { MondayAgentToolkit } from 'src/mcp/toolkit';

export type inputType = z.objectInputType<FullBoardDataToolSchema, ZodTypeAny>;

describe('Full Board Data Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockBoardResponse = {
    boards: [
      {
        id: '123456',
        name: 'Test Board',
        columns: [
          {
            id: 'status',
            title: 'Status',
            type: ColumnType.Status,
            settings: '{}',
          },
          {
            id: 'text',
            title: 'Text',
            type: ColumnType.Text,
            settings: '{}',
          },
        ],
        items_page: {
          items: [
            {
              id: '111',
              name: 'Item 1',
              column_values: [
                {
                  id: 'status',
                  text: 'Done',
                  type: ColumnType.Status,
                  value: '{"index":1}',
                },
              ],
              updates: [
                {
                  id: 'update1',
                  creator_id: 'user1',
                  text_body: 'First update',
                  created_at: '2023-01-01T00:00:00Z',
                },
                {
                  id: 'update2',
                  creator_id: 'user2',
                  text_body: 'Second update',
                  created_at: '2023-01-02T00:00:00Z',
                },
                {
                  id: 'update3_auto',
                  creator_id: '-4',
                  text_body: 'Automation update',
                  created_at: '2023-01-02T12:00:00Z',
                },
              ],
            },
            {
              id: '222',
              name: 'Item 2',
              column_values: [
                {
                  id: 'text',
                  text: 'Hello',
                  type: ColumnType.Text,
                  value: '"Hello"',
                },
              ],
              updates: [
                {
                  id: 'update3',
                  creator_id: 'user1',
                  text_body: 'Third update',
                  created_at: '2023-01-03T00:00:00Z',
                },
              ],
            },
          ],
        },
      },
    ],
  };

  const mockUsersResponse = {
    users: [
      {
        id: 'user1',
        name: 'John Doe',
        photo_tiny: 'https://example.com/user1.jpg',
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        photo_tiny: 'https://example.com/user2.jpg',
      },
    ],
  };

  it('Successfully fetches board data with items, updates, and enriches with user info', async () => {
    // Setup mock to return different responses for each query
    let callCount = 0;
    mocks.mockApiClient.request.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(mockBoardResponse);
      } else {
        return Promise.resolve(mockUsersResponse);
      }
    });

    const args: inputType = {
      boardId: '123456',
    };

    const parsedResult = await callToolByNameAsync('get_full_board_data', args);

    // Verify board data
    expect(parsedResult.board.id).toBe('123456');
    expect(parsedResult.board.name).toBe('Test Board');
    expect(parsedResult.board.columns).toHaveLength(2);
    expect(parsedResult.board.items).toHaveLength(2);

    // Verify items
    expect(parsedResult.board.items[0].id).toBe('111');
    expect(parsedResult.board.items[0].name).toBe('Item 1');
    expect(parsedResult.board.items[0].updates).toHaveLength(3);

    // Verify updates are enriched with creator info
    expect(parsedResult.board.items[0].updates[0].creator).toEqual({
      id: 'user1',
      name: 'John Doe',
      photo_tiny: 'https://example.com/user1.jpg',
    });
    expect(parsedResult.board.items[0].updates[1].creator).toEqual({
      id: 'user2',
      name: 'Jane Smith',
      photo_tiny: 'https://example.com/user2.jpg',
    });

    // Verify negative creator IDs are not enriched but update is still present
    expect(parsedResult.board.items[0].updates[2].creator_id).toBe('-4');
    expect(parsedResult.board.items[0].updates[2].creator).toBeNull();

    // Verify users list (only valid users, not negative IDs)
    expect(parsedResult.users).toHaveLength(2);

    // Verify stats
    expect(parsedResult.stats.total_items).toBe(2);
    expect(parsedResult.stats.total_updates).toBe(4);
    expect(parsedResult.stats.total_unique_creators).toBe(2);

    // Verify API calls - negative IDs should not be included in user fetch
    expect(mocks.mockApiClient.request).toHaveBeenCalledTimes(2);
    expect(mocks.mockApiClient.request).toHaveBeenCalledWith(expect.stringContaining('query getBoardData'), {
      boardId: '123456',
      itemsLimit: 7,
    });
    const userIdsCall = (mocks.mockApiClient.request as jest.Mock).mock.calls[1][1].userIds;
    expect(userIdsCall).toContain('user1');
    expect(userIdsCall).toContain('user2');
    expect(userIdsCall).not.toContain('-4');
  });

  it('Skips user fetch when there are no valid user IDs (no updates or only negative IDs)', async () => {
    const boardWithoutValidUserIds = {
      boards: [
        {
          id: '123456',
          name: 'Empty Board',
          columns: [],
          items_page: {
            items: [
              {
                id: '111',
                name: 'Item without updates',
                column_values: [],
                updates: [],
              },
              {
                id: '222',
                name: 'Item with only automation updates',
                column_values: [],
                updates: [
                  {
                    id: 'update_auto',
                    creator_id: '-4',
                    text_body: 'Automation update',
                    created_at: '2023-01-01T00:00:00Z',
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    mocks.setResponse(boardWithoutValidUserIds);

    const args: inputType = {
      boardId: '123456',
    };

    const parsedResult = await callToolByNameAsync('get_full_board_data', args);

    expect(parsedResult.board.items).toHaveLength(2);
    expect(parsedResult.board.items[0].updates).toHaveLength(0);
    expect(parsedResult.board.items[1].updates).toHaveLength(1);
    expect(parsedResult.board.items[1].updates[0].creator).toBeNull();
    expect(parsedResult.users).toHaveLength(0);
    expect(parsedResult.stats.total_unique_creators).toBe(0);

    // Should only call board query, not users query
    expect(mocks.mockApiClient.request).toHaveBeenCalledTimes(1);
  });

  it('Throws error when board is not found', async () => {
    // Test with empty array
    mocks.setResponse({ boards: [] });
    const args1: inputType = { boardId: '999999' };
    const result1 = await callToolByNameRawAsync('get_full_board_data', args1);
    expect(result1.content[0].text).toContain('Board with ID 999999 not found');

    // Test with null
    mocks.setResponse({ boards: null });
    const args2: inputType = { boardId: '888888' };
    const result2 = await callToolByNameRawAsync('get_full_board_data', args2);
    expect(result2.content[0].text).toContain('Board with ID 888888 not found');
  });

  it('Handles updates with null creator_id gracefully', async () => {
    const boardWithNullCreators = {
      boards: [
        {
          id: '123456',
          name: 'Test Board',
          columns: [],
          items_page: {
            items: [
              {
                id: '111',
                name: 'Item 1',
                column_values: [],
                updates: [
                  {
                    id: 'update1',
                    creator_id: null,
                    text_body: 'Update without creator',
                    created_at: '2023-01-01T00:00:00Z',
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    mocks.setResponse(boardWithNullCreators);

    const args: inputType = {
      boardId: '123456',
    };

    const parsedResult = await callToolByNameAsync('get_full_board_data', args);

    expect(parsedResult.board.items[0].updates[0].creator_id).toBe('');
    expect(parsedResult.board.items[0].updates[0].creator).toBeNull();
    expect(parsedResult.users).toHaveLength(0);

    // Should only call board query since no valid creator IDs
    expect(mocks.mockApiClient.request).toHaveBeenCalledTimes(1);
  });

  it('Handles GraphQL response errors', async () => {
    const graphqlError = new Error('GraphQL Error');
    (graphqlError as any).response = {
      errors: [{ message: 'Invalid board ID' }, { message: 'Insufficient permissions' }],
    };
    mocks.setError(graphqlError);

    const args: inputType = {
      boardId: '123456',
    };

    const result = await callToolByNameRawAsync('get_full_board_data', args);
    expect(result.content[0].text).toContain('Failed to get full board data: Invalid board ID, Insufficient permissions');
  });

  it('Extracts user IDs from people column values', async () => {
    const boardWithPeopleColumn = {
      boards: [
        {
          id: '123456',
          name: 'Test Board',
          columns: [],
          items_page: {
            items: [
              {
                id: '111',
                name: 'Item 1',
                column_values: [
                  {
                    id: 'people',
                    text: 'John Doe, Team Alpha',
                    type: ColumnType.People,
                    value: '{}',
                    persons_and_teams: [
                      { id: 'user123', kind: 'person' },
                      { id: 'team456', kind: 'team' }, // Should be filtered out
                      { id: 'user789', kind: 'person' },
                    ],
                  },
                ],
                updates: [],
              },
            ],
          },
        },
      ],
    };

    const mockPeopleUsersResponse = {
      users: [
        { id: 'user123', name: 'John Doe', photo_tiny: 'https://example.com/user123.jpg' },
        { id: 'user789', name: 'Jane Smith', photo_tiny: 'https://example.com/user789.jpg' },
      ],
    };

    let callCount = 0;
    mocks.mockApiClient.request.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(boardWithPeopleColumn);
      } else {
        return Promise.resolve(mockPeopleUsersResponse);
      }
    });

    const args: inputType = { boardId: '123456' };
    const parsedResult = await callToolByNameAsync('get_full_board_data', args);

    // Should extract only person IDs, not team IDs
    expect(parsedResult.users).toHaveLength(2);
    expect(parsedResult.users.map((u: any) => u.id)).toEqual(['user123', 'user789']);

    // Verify getUsersByIds was called with only person IDs
    const userIdsCall = (mocks.mockApiClient.request as jest.Mock).mock.calls[1][1].userIds;
    expect(userIdsCall).toContain('user123');
    expect(userIdsCall).toContain('user789');
    expect(userIdsCall).not.toContain('team456');
  });

});
