import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { UserContextTool } from './user-context-tool';
import { GraphqlMondayObject, GetFavoriteDetailsQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { GetUserContextQuery } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('UserContextTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockUserContextResponse: GetUserContextQuery = {
    me: {
      id: '123',
      name: 'John Doe',
      title: 'Product Manager',
      account: {
        tier: 'enterprise',
        active_members_count: 150,
        is_during_trial: false,
        products: [
          { kind: 'core', tier: 'enterprise' },
          { kind: 'crm', tier: 'enterprise' },
          null,
        ],
      },
    },
    favorites: [
      { object: { id: '1', type: GraphqlMondayObject.Board } },
      { object: { id: '2', type: GraphqlMondayObject.Board } },
      { object: { id: '10', type: GraphqlMondayObject.Folder } },
      { object: { id: '20', type: GraphqlMondayObject.Workspace } },
      { object: { id: '30', type: GraphqlMondayObject.Dashboard } },
    ],
    intelligence: {
      relevant_boards: [
        { id: '100', board: { name: 'Top Board' } },
        { id: '101', board: { name: 'Recent Board' } },
      ],
      relevant_people: [
        { id: '200', user: { name: 'Alice Smith' } },
        { id: '201', user: { name: 'Bob Jones' } },
      ],
    },
  };

  const mockFavoriteDetailsQuery: GetFavoriteDetailsQuery = {
    boards: [
      { id: '1', name: 'Marketing Board' },
      { id: '2', name: 'Sprint Planning' },
    ],
    folders: [{ id: '10', name: 'Projects Folder' }],
    workspaces: [{ id: '20', name: 'Engineering Workspace' }],
    dashboards: [{ id: '30', name: 'Q1 Dashboard' }],
  };

  it('should fetch user context, favorites, and relevant boards', async () => {
    mocks.setResponseOnce(mockUserContextResponse);
    mocks.setResponseOnce(mockFavoriteDetailsQuery);

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      message: 'User context',
      user: {
        id: '123',
        name: 'John Doe',
        title: 'Product Manager',
      },
      account: {
        tier: 'enterprise',
        active_members_count: 150,
        is_during_trial: false,
        products: [
          { kind: 'core', tier: 'enterprise' },
          { kind: 'crm', tier: 'enterprise' },
        ],
      },
      favorites: [
        { id: '1', name: 'Marketing Board', type: 'Board' },
        { id: '2', name: 'Sprint Planning', type: 'Board' },
        { id: '10', name: 'Projects Folder', type: 'Folder' },
        { id: '20', name: 'Engineering Workspace', type: 'Workspace' },
        { id: '30', name: 'Q1 Dashboard', type: 'Dashboard' },
      ],
      relevantBoards: [
        { id: '100', name: 'Top Board' },
        { id: '101', name: 'Recent Board' },
      ],
      relevantPeople: [
        { id: '200', name: 'Alice Smith' },
        { id: '201', name: 'Bob Jones' },
      ],
    };

    const parsed = parseToolResult(result);
    expect(parsed).toEqual(expectedOutput);

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('getUserContext'),
      {},
      expect.objectContaining({ versionOverride: 'dev' }),
    );
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('getFavoriteDetails'),
      {
        boardIds: ['1', '2'],
        folderIds: ['10'],
        workspaceIds: ['20'],
        dashboardIds: ['30'],
      },
    );
  });

  it('should handle empty favorites and no relevant boards', async () => {
    mocks.setResponseOnce({
      me: { id: '123', name: 'John Doe', title: null, account: { tier: 'free', active_members_count: 1, is_during_trial: true, products: [] } },
      favorites: [],
      intelligence: null,
    });

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      message: 'User context',
      user: {
        id: '123',
        name: 'John Doe',
        title: null,
      },
      account: {
        tier: 'free',
        active_members_count: 1,
        is_during_trial: true,
        products: [],
      },
      favorites: [],
      relevantBoards: [],
      relevantPeople: [],
    };

    const parsed = parseToolResult(result);
    expect(parsed).toEqual(expectedOutput);
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
  });

  it('should filter out null items from details response', async () => {
    mocks.setResponseOnce({
      me: { id: '123', name: 'John Doe', title: 'Dev', account: { tier: 'pro', active_members_count: 50, is_during_trial: false, products: [{ kind: 'core', tier: 'pro' }] } },
      favorites: [{ object: { id: '1', type: GraphqlMondayObject.Board } }],
      intelligence: {
        relevant_boards: [
          { id: '200', board: { name: 'Active Board' } },
          { id: '300', board: null }, // Should be filtered out
        ],
        relevant_people: [
          { id: '400', user: { name: 'Valid Person' } },
          { id: '500', user: null }, // Should be filtered out
        ],
      },
    });
    mocks.setResponseOnce({
      boards: [{ id: '1', name: 'Valid Board' }, null],
      folders: [null],
      workspaces: [],
      dashboards: [],
    });

    const result = await callToolByNameRawAsync('get_user_context', {});

    const expectedOutput = {
      message: 'User context',
      user: {
        id: '123',
        name: 'John Doe',
        title: 'Dev',
      },
      account: {
        tier: 'pro',
        active_members_count: 50,
        is_during_trial: false,
        products: [{ kind: 'core', tier: 'pro' }],
      },
      favorites: [{ id: '1', name: 'Valid Board', type: 'Board' }],
      relevantBoards: [{ id: '200', name: 'Active Board' }],
      relevantPeople: [{ id: '400', name: 'Valid Person' }],
    };

    const parsed = parseToolResult(result);
    expect(parsed).toEqual(expectedOutput);
  });

  it('should return auth error when user not found', async () => {
    mocks.setResponseOnce({ me: null, favorites: [], intelligence: null });
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
