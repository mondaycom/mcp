import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { UserContextTool } from './user-context-tool';
import { GraphqlMondayObject } from 'src/monday-graphql/generated/graphql/graphql';
import { GetUserContextQuery, GetFavoriteDetailsQuery } from 'src/monday-graphql/generated/graphql/graphql';

describe('UserContextTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockUserContextResponse: GetUserContextQuery = {
    me: { id: '123', name: 'John Doe', title: 'Product Manager' },
    favorites: [
      { object: { id: '1', type: GraphqlMondayObject.Board } },
      { object: { id: '2', type: GraphqlMondayObject.Board } },
      { object: { id: '10', type: GraphqlMondayObject.Folder } },
      { object: { id: '20', type: GraphqlMondayObject.Workspace } },
      { object: { id: '30', type: GraphqlMondayObject.Dashboard } },
    ],
  };

  const mockFavoriteDetailsResponse: GetFavoriteDetailsQuery = {
    boards: [
      { id: '1', name: 'Marketing Board' },
      { id: '2', name: 'Sprint Planning' },
    ],
    folders: [{ id: '10', name: 'Projects Folder' }],
    workspaces: [{ id: '20', name: 'Engineering Workspace' }],
    dashboards: [{ id: '30', name: 'Q1 Dashboard' }],
  };

  it('should fetch user context and favorites', async () => {
    mocks.setResponseOnce(mockUserContextResponse);
    mocks.setResponseOnce(mockFavoriteDetailsResponse);

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      user: {
        id: '123',
        name: 'John Doe',
        title: 'Product Manager',
      },
      favorites: [
        { id: '1', name: 'Marketing Board', type: 'Board' },
        { id: '2', name: 'Sprint Planning', type: 'Board' },
        { id: '10', name: 'Projects Folder', type: 'Folder' },
        { id: '20', name: 'Engineering Workspace', type: 'Workspace' },
        { id: '30', name: 'Q1 Dashboard', type: 'Dashboard' },
      ],
    };

    expect(result.content[0].text).toBe(JSON.stringify(expectedOutput, null, 2));

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(1, expect.stringContaining('getUserContext'));
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(2, expect.stringContaining('getFavoriteDetails'), {
      boardIds: ['1', '2'],
      folderIds: ['10'],
      workspaceIds: ['20'],
      dashboardIds: ['30'],
    });
  });

  it('should handle empty favorites', async () => {
    mocks.setResponseOnce({
      me: { id: '123', name: 'John Doe', title: null },
      favorites: [],
    });

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      user: {
        id: '123',
        name: 'John Doe',
        title: null,
      },
      favorites: [],
    };

    expect(result.content[0].text).toBe(JSON.stringify(expectedOutput, null, 2));
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
  });

  it('should filter out null items from details response', async () => {
    mocks.setResponseOnce({
      me: { id: '123', name: 'John Doe', title: 'Dev' },
      favorites: [{ object: { id: '1', type: GraphqlMondayObject.Board } }],
    });
    mocks.setResponseOnce({
      boards: [{ id: '1', name: 'Valid Board' }, null],
      folders: [null],
      workspaces: [],
      dashboards: [],
    });

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      user: {
        id: '123',
        name: 'John Doe',
        title: 'Dev',
      },
      favorites: [{ id: '1', name: 'Valid Board', type: 'Board' }],
    };

    expect(result.content[0].text).toBe(JSON.stringify(expectedOutput, null, 2));
  });

  it('should return auth error when user not found', async () => {
    mocks.setResponseOnce({ me: null, favorites: [] });
    const result = await callToolByNameRawAsync('get_user_context', {});
    expect(result.content[0].text).toBe(
      'AUTHENTICATION_ERROR: Unable to fetch current user. Verify API token and user permissions.',
    );
  });

  it('should handle GraphQL error', async () => {
    mocks.setError('Unauthorized');
    const result = await callToolByNameRawAsync('get_user_context', {});
    expect(result.content[0].text).toBe('Failed to execute tool get_user_context: Unauthorized');
  });
});
