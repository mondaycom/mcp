import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { UserContextTool } from './user-context-tool';
import { getNotetakerStatusQuery } from './user-context-notetaker';
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
        products: [{ kind: 'core', tier: 'enterprise' }, { kind: 'crm', tier: 'enterprise' }, null],
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
      relevant_docs: [
        { id: '300', object_id: '3001', document: { name: 'Product Spec' } },
        { id: '301', object_id: '3011', document: { name: 'Meeting Notes' } },
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

  it('should fetch user context, favorites, relevant boards, and relevant docs', async () => {
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
      relevantDocs: [
        { id: '300', name: 'Product Spec', objectId: '3001' },
        { id: '301', name: 'Meeting Notes', objectId: '3011' },
      ],
      relevantPeople: [
        { id: '200', name: 'Alice Smith' },
        { id: '201', name: 'Bob Jones' },
      ],
    };

    const parsed = parseToolResult(result);
    expect(parsed).toEqual(expectedOutput);

    // getUserContext, getFavoriteDetails, getNotetakerStatus (unmocked here, so the notetaker block is omitted)
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('getUserContext'),
      {},
      expect.objectContaining({ versionOverride: 'dev' }),
    );
    expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(2, expect.stringContaining('getFavoriteDetails'), {
      boardIds: ['1', '2'],
      folderIds: ['10'],
      workspaceIds: ['20'],
      dashboardIds: ['30'],
    });
  });

  it('should handle empty favorites and no relevant boards', async () => {
    mocks.setResponseOnce({
      me: {
        id: '123',
        name: 'John Doe',
        title: null,
        account: { tier: 'free', active_members_count: 1, is_during_trial: true, products: [] },
      },
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
      relevantDocs: [],
      relevantPeople: [],
    };

    const parsed = parseToolResult(result);
    expect(parsed).toEqual(expectedOutput);
    // getUserContext, getNotetakerStatus
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
  });

  it('should filter out null items from details response', async () => {
    mocks.setResponseOnce({
      me: {
        id: '123',
        name: 'John Doe',
        title: 'Dev',
        account: {
          tier: 'pro',
          active_members_count: 50,
          is_during_trial: false,
          products: [{ kind: 'core', tier: 'pro' }],
        },
      },
      favorites: [{ object: { id: '1', type: GraphqlMondayObject.Board } }],
      intelligence: {
        relevant_boards: [
          { id: '200', board: { name: 'Active Board' } },
          { id: '300', board: null }, // Should be filtered out
        ],
        relevant_docs: [
          { id: '600', object_id: '6001', document: { name: 'Active Doc' } },
          { id: '700', object_id: '7001', document: null }, // Should be filtered out
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
      relevantDocs: [{ id: '600', name: 'Active Doc', objectId: '6001' }],
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

  describe('partial intelligence errors', () => {
    type GqlError = { message: string; path: unknown[]; extensions?: { code: string } };
    const clientError = (data: unknown, errors: GqlError[]) =>
      Object.assign(new Error(errors[0].message), { response: { data, errors } });
    const notFound = (index: number): GqlError => ({
      message: 'User not found',
      path: ['intelligence', 'relevant_people', index, 'user'],
      extensions: { code: 'NOT_FOUND' },
    });

    const partialData: GetUserContextQuery = {
      ...mockUserContextResponse,
      favorites: [],
      intelligence: {
        ...mockUserContextResponse.intelligence,
        relevant_people: [
          { id: '200', user: { name: 'Alice Smith' } },
          { id: '201', user: null },
        ],
      },
    };

    it('keeps the context, drops unresolved people and logs when every error is a NOT_FOUND under intelligence', async () => {
      const warn = jest.fn();
      mocks.getMockRequest().mockRejectedValueOnce(clientError(partialData, [notFound(1)]));
      mocks.setResponseOnce({ notetaker: { settings: null } });

      const tool = new UserContextTool(mocks.mockApiClient, { deps: { logger: { warn } } });
      const result = (await tool.execute()) as { content: Record<string, unknown> };

      expect(result.content.message).toBe('User context');
      expect(result.content.user).toEqual({ id: '123', name: 'John Doe', title: 'Product Manager' });
      expect(result.content.relevantPeople).toEqual([{ id: '200', name: 'Alice Smith' }]);
      expect(result.content.relevantDocs).toHaveLength(2);
      expect(warn).toHaveBeenCalledWith(
        { errorCount: 1, paths: ['intelligence.relevant_people'] },
        expect.stringContaining('partial data'),
      );
    });

    it('still fails when an error under intelligence is not a NOT_FOUND', async () => {
      mocks
        .getMockRequest()
        .mockRejectedValueOnce(
          clientError(partialData, [
            notFound(1),
            { message: 'Timeout', path: ['intelligence', 'relevant_docs'], extensions: { code: 'TIMEOUT' } },
          ]),
        );

      const result = await callToolByNameRawAsync('get_user_context', {});

      expect(result.content[0].text).toBe('Failed to execute tool get_user_context: User not found');
    });

    it('still fails when an error has no code', async () => {
      mocks
        .getMockRequest()
        .mockRejectedValueOnce(
          clientError(partialData, [
            { message: 'User not found', path: ['intelligence', 'relevant_people', 1, 'user'] },
          ]),
        );

      const result = await callToolByNameRawAsync('get_user_context', {});

      expect(result.content[0].text).toBe('Failed to execute tool get_user_context: User not found');
    });

    it('still fails when an error is outside intelligence', async () => {
      mocks
        .getMockRequest()
        .mockRejectedValueOnce(
          clientError(partialData, [
            notFound(1),
            { message: 'Not found', path: ['favorites'], extensions: { code: 'NOT_FOUND' } },
          ]),
        );

      const result = await callToolByNameRawAsync('get_user_context', {});

      expect(result.content[0].text).toBe('Failed to execute tool get_user_context: User not found');
    });

    it('still fails when there is no user in the partial data', async () => {
      mocks.getMockRequest().mockRejectedValueOnce(clientError({ ...partialData, me: null }, [notFound(1)]));

      const result = await callToolByNameRawAsync('get_user_context', {});

      expect(result.content[0].text).toBe('Failed to execute tool get_user_context: User not found');
    });
  });

  describe('notetaker block', () => {
    const userOnlyResponse: GetUserContextQuery = {
      me: {
        id: '123',
        name: 'John Doe',
        title: 'Dev',
        account: { tier: 'pro', active_members_count: 5, is_during_trial: false, products: [] },
      },
      favorites: [],
      intelligence: null,
    };

    const notetakerSettings = {
      status: 'AUTO_JOIN_OFF',
      has_access: true,
      reason: null,
      calendar_connected: true,
      setup_url: null,
      instructions: 'Ask the user which meetings Notetaker should join.',
      auto_join: { self_hosted: 'OFF', invited: 'OFF', locked: { self_hosted: false, invited: true } },
    };

    it('includes the notetaker status when available', async () => {
      mocks.setResponseOnce(userOnlyResponse);
      mocks.setResponseOnce({ notetaker: { settings: notetakerSettings } });

      const parsed = parseToolResult(await callToolByNameRawAsync('get_user_context', {}));

      expect(parsed.notetaker).toEqual(notetakerSettings);
      expect(mocks.getMockRequest()).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('getNotetakerStatus'),
        {},
        { versionOverride: '2027-01', timeout: 1500 },
      );
    });

    it.each([
      ['NO_ACCESS', false, 'BLOCKED', true, 'Tell the user an account admin blocked Notetaker.'],
      ['NOT_CONNECTED', true, null, false, 'Call show_connect_integration for googleCalendar and outlookCalendar.'],
      ['NOT_CONNECTED', true, null, null, 'Ask the user whether they already connected a calendar.'],
      ['AUTO_JOIN_OFF', true, null, true, 'Ask the user which meetings Notetaker should join.'],
      ['AUTO_JOIN_LOCKED_OFF', true, null, true, 'Tell the user an account admin locked auto-join off.'],
      ['ACTIVE', true, null, true, null],
      ['ACTIVE', false, 'NO_CREDITS', true, 'Tell the user Notetaker is on hold until credits renew.'],
    ] as const)(
      'passes through status %s (has_access %s, reason %s, calendar_connected %s) with its instructions',
      async (status, has_access, reason, calendar_connected, instructions) => {
        const settings = { ...notetakerSettings, status, has_access, reason, calendar_connected, instructions };
        mocks.setResponseOnce(userOnlyResponse);
        mocks.setResponseOnce({ notetaker: { settings } });

        const parsed = parseToolResult(await callToolByNameRawAsync('get_user_context', {}));

        expect(parsed.notetaker).toEqual(settings);
        expect(parsed.notetaker.instructions).toBe(instructions);
      },
    );

    it('requests the instructions and keeps per-status guidance out of the description', () => {
      const description = new UserContextTool(mocks.mockApiClient as any).getDescription();

      expect(getNotetakerStatusQuery).toContain('instructions');
      expect(description).toContain('notetaker.instructions');
      for (const status of ['NO_ACCESS', 'NOT_CONNECTED', 'AUTO_JOIN_OFF', 'AUTO_JOIN_LOCKED_OFF']) {
        expect(description).not.toContain(status);
      }
      expect(description).not.toContain('show_connect_integration');
    });

    it('omits the notetaker block when settings are null (feature off for the account)', async () => {
      mocks.setResponseOnce(userOnlyResponse);
      mocks.setResponseOnce({ notetaker: { settings: null } });

      const parsed = parseToolResult(await callToolByNameRawAsync('get_user_context', {}));

      expect(parsed).not.toHaveProperty('notetaker');
      expect(parsed.user).toEqual({ id: '123', name: 'John Doe', title: 'Dev' });
    });

    it('omits the notetaker block and keeps the rest when the notetaker call fails or times out', async () => {
      mocks.setResponseOnce(userOnlyResponse);
      mocks.getMockRequest().mockRejectedValueOnce(new Error('The operation was aborted due to timeout'));

      const parsed = parseToolResult(await callToolByNameRawAsync('get_user_context', {}));

      expect(parsed).not.toHaveProperty('notetaker');
      expect(parsed.message).toBe('User context');
      expect(parsed.user).toEqual({ id: '123', name: 'John Doe', title: 'Dev' });
    });

    it('does not call notetaker when the user cannot be resolved', async () => {
      mocks.setResponseOnce({ me: null, favorites: [], intelligence: null });

      await callToolByNameRawAsync('get_user_context', {});

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });
});
