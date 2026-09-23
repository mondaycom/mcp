import {
  formatBoardInfoAsJson,
  BoardInfoData,
  BoardKnowledgeData,
  normalizeViewName,
  resolveViewIdsByName,
} from './helpers';
import { BoardViewAccessLevel, State, BoardKind, WorkspaceKind } from '../../../../monday-graphql/generated/graphql/graphql';
import {
  EntityKnowledgeSectionKey,
  EntityKnowledgeSectionKind,
  EntityKnowledgeStatus,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { NonDeprecatedColumnType } from 'src/utils/types';
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { GET_BOARD_INFO_ENTITY_KNOWLEDGE_FLAG, GetBoardInfoTool } from './get-board-info-tool';

describe('formatBoardInfoAsJson - board structure', () => {
  it('should include core board fields and nested relations', () => {
    const mockBoard: BoardInfoData = {
      id: '123456789',
      name: 'Test Board',
      description: 'A test board for unit testing',
      state: State.Active,
      board_kind: BoardKind.Public,
      permissions: 'write',
      url: 'https://monday.com/boards/123456789',
      updated_at: '2024-01-15T10:30:00Z',
      item_terminology: 'tasks',
      items_count: 25,
      items_limit: 100,
      board_folder_id: 'folder_123',
      creator: {
        id: 'creator_1',
        name: 'John Doe',
        email: 'john.doe@example.com',
      },
      workspace: {
        id: 'workspace_1',
        name: 'Development Team',
        kind: WorkspaceKind.Open,
        description: 'Main development workspace',
      },
      owners: [
        { id: 'owner_1', name: 'Alice Smith' },
        { id: 'owner_2', name: 'Bob Johnson' },
      ],
      team_owners: [{ id: 'team_1', name: 'Frontend Team', picture_url: 'https://example.com/pic1.jpg' }],
      groups: [
        { id: 'group_1', title: 'To Do' },
        { id: 'group_2', title: 'In Progress' },
      ],
      top_group: {
        id: 'top_group_1',
      },
      columns: [
        {
          id: 'col_1',
          title: 'Task Name',
          description: 'The name of the task',
          type: NonDeprecatedColumnType.Text,
          settings: { width: 200 },
        },
        {
          id: 'col_2',
          title: 'Status',
          description: undefined,
          type: NonDeprecatedColumnType.Status,
          settings: { labels: ['Not Started', 'In Progress', 'Done'] },
        },
      ],
      tags: [
        { id: 'tag_1', name: 'urgent' },
        { id: 'tag_2', name: 'bug-fix' },
      ],
    } as BoardInfoData;

    const result = formatBoardInfoAsJson(mockBoard, null);

    expect(result.board.name).toBe('Test Board');
    expect(result.board.id).toBe('123456789');
    expect(result.board.creator?.name).toBe('John Doe');
    expect(result.board.workspace?.name).toBe('Development Team');
    expect(result.board.columns).toHaveLength(2);
    expect(result.board.subItemColumns).toBeUndefined();
    expect(Object.keys(result)).toEqual(['board', 'knowledge']);
    expect(result.knowledge).toBeNull();
  });

  it('should handle minimal board data', () => {
    const minimalBoard = {
      id: '123',
      name: 'Minimal Board',
      description: undefined,
      state: State.Active,
      board_kind: BoardKind.Private,
      permissions: 'read',
      url: 'https://monday.com/boards/123',
      updated_at: undefined,
      item_terminology: undefined,
      items_count: undefined,
      items_limit: undefined,
      board_folder_id: undefined,
      creator: undefined,
      workspace: undefined,
      owners: [],
      team_owners: undefined,
      groups: [],
      top_group: undefined,
      columns: [],
      tags: undefined,
    } as any;

    const result = formatBoardInfoAsJson(minimalBoard, null);

    expect(result.board.name).toBe('Minimal Board');
    expect(result.board.columns).toEqual([]);
    expect(Object.keys(result)).toEqual(['board', 'knowledge']);
    expect(result.knowledge).toBeNull();
  });

  it('should attach subItemColumns when sub-items board is provided', () => {
    const mockBoard = {
      id: '123456789',
      name: 'Main Board',
      description: 'Main board with items',
      state: State.Active,
      board_kind: BoardKind.Public,
      permissions: 'write',
      url: 'https://monday.com/boards/123456789',
      updated_at: '2024-01-15T10:30:00Z',
      item_terminology: 'tasks',
      items_count: 25,
      items_limit: 100,
      board_folder_id: 'folder_123',
      creator: undefined,
      workspace: undefined,
      owners: [],
      team_owners: undefined,
      groups: [],
      top_group: undefined,
      columns: [
        {
          id: 'main_col_1',
          title: 'Main Task Name',
          description: 'The name of the main task',
          type: NonDeprecatedColumnType.Text,
          settings: { width: 200 },
        },
      ],
      tags: undefined,
    } as any;

    const mockSubItemBoard = {
      id: '987654321',
      name: 'Sub Items Board',
      columns: [
        {
          id: 'sub_col_1',
          title: 'Sub Task Name',
          description: 'The name of the sub task',
          type: NonDeprecatedColumnType.Text,
          settings: { width: 150 },
        },
      ],
    } as any;

    const result = formatBoardInfoAsJson(mockBoard, mockSubItemBoard);

    expect(result.board.columns).toHaveLength(1);
    expect(result.board.subItemColumns).toHaveLength(1);
    expect(result.board.subItemColumns?.[0]?.id).toBe('sub_col_1');
  });
});

describe('formatBoardInfoAsJson - knowledge', () => {
  const board = {
    id: '123',
    name: 'Test Board',
    columns: [],
    views: [],
  } as unknown as BoardInfoData;

  it('returns structured knowledge as JSON', () => {
    const knowledge: BoardKnowledgeData = {
      summary: 'Engineering; primary workflow: Status',
      status: EntityKnowledgeStatus.Fresh,
      age_seconds: 120,
      sections: [
        {
          key: EntityKnowledgeSectionKey.BusinessContext,
          title: 'Business Context',
          kind: EntityKnowledgeSectionKind.Structured,
          confidence: 0.9,
          body_markdown: null,
          data: {
            vertical: 'Engineering',
            goal: 'Track product delivery',
          },
        },
        {
          key: EntityKnowledgeSectionKey.ColumnDictionary,
          title: 'Column Dictionary',
          kind: EntityKnowledgeSectionKind.Structured,
          confidence: 0.8,
          body_markdown: null,
          data: {
            status: {
              title: 'Status',
              type: 'status',
              semanticRole: 'Tracks the delivery stage.',
            },
          },
        },
      ],
    };

    const result = formatBoardInfoAsJson(board, null, undefined, knowledge);

    expect(result.knowledge).toEqual({
      summary: 'Engineering; primary workflow: Status',
      status: EntityKnowledgeStatus.Fresh,
      ageSeconds: 120,
      sections: [
        {
          key: EntityKnowledgeSectionKey.BusinessContext,
          title: 'Business Context',
          kind: EntityKnowledgeSectionKind.Structured,
          confidence: 0.9,
          bodyMarkdown: null,
          data: {
            vertical: 'Engineering',
            goal: 'Track product delivery',
          },
        },
        {
          key: EntityKnowledgeSectionKey.ColumnDictionary,
          title: 'Column Dictionary',
          kind: EntityKnowledgeSectionKind.Structured,
          confidence: 0.8,
          bodyMarkdown: null,
          data: {
            status: {
              title: 'Status',
              type: 'status',
              semanticRole: 'Tracks the delivery stage.',
            },
          },
        },
      ],
    });
  });

  it('preserves Markdown section bodies', () => {
    const knowledge: BoardKnowledgeData = {
      summary: null,
      status: EntityKnowledgeStatus.Stale,
      age_seconds: null,
      sections: [
        {
          key: EntityKnowledgeSectionKey.BusinessContext,
          title: 'Business Context',
          kind: EntityKnowledgeSectionKind.Markdown,
          confidence: 0.5,
          body_markdown: 'Tracks engineering delivery.',
          data: null,
        },
      ],
    };

    const result = formatBoardInfoAsJson(board, null, undefined, knowledge);

    expect(result.knowledge?.sections[0]).toEqual({
      key: EntityKnowledgeSectionKey.BusinessContext,
      title: 'Business Context',
      kind: EntityKnowledgeSectionKind.Markdown,
      confidence: 0.5,
      bodyMarkdown: 'Tracks engineering delivery.',
      data: null,
    });
  });

  it('omits knowledge when it is disabled', () => {
    const result = formatBoardInfoAsJson(board, null, undefined, null, false);

    expect(result).not.toHaveProperty('knowledge');
  });
});

describe('formatBoardInfoAsJson - views', () => {
  const baseBoard: BoardInfoData = {
    id: '123',
    name: 'Test Board',
    description: 'desc',
    state: State.Active,
    board_kind: BoardKind.Public,
    permissions: 'write',
    url: 'https://monday.com/boards/123',
    updated_at: '2024-01-01',
    item_terminology: 'items',
    items_count: 0,
    items_limit: null,
    board_folder_id: null,
    creator: null,
    workspace: null,
    owners: [],
    team_owners: [],
    groups: [],
    top_group: null,
    columns: [],
    tags: [],
    views: [],
  } as unknown as BoardInfoData;

  it('should include views in the JSON response', () => {
    const board: BoardInfoData = {
      ...baseBoard,
      views: [
        {
          id: 'view_1',
          name: 'My Tasks',
          type: 'TableBoardView',
          settings: {},
          filter: {
            operator: 'AND',
            groups: [{ operator: 'AND', rules: [{ column_id: 'person', compare_value: ['assigned_to_me'], operator: 'ANY_OF' }] }],
          },
          sort: [],
          access_level: BoardViewAccessLevel.Edit,
        },
      ],
    } as unknown as BoardInfoData;

    const result = formatBoardInfoAsJson(board, null) as any;

    expect(result.board.views).toHaveLength(1);
  });

  it('should include view id and name', () => {
    const board: BoardInfoData = {
      ...baseBoard,
      views: [
        {
          id: 'view_1',
          name: 'My Tasks',
          type: 'TableBoardView',
          settings: {},
          filter: null,
          sort: [],
          access_level: BoardViewAccessLevel.Edit,
        },
      ],
    } as unknown as BoardInfoData;

    const result = formatBoardInfoAsJson(board, null) as any;

    expect(result.board.views[0].id).toBe('view_1');
    expect(result.board.views[0].name).toBe('My Tasks');
  });

  it('should include the structured filter object from the view', () => {
    const filter = {
      operator: 'AND',
      groups: [{ operator: 'AND', rules: [{ column_id: 'person', compare_value: ['assigned_to_me'], operator: 'ANY_OF' }] }],
    };
    const board: BoardInfoData = {
      ...baseBoard,
      views: [
        {
          id: 'view_1',
          name: 'Assigned to Me',
          type: 'TableBoardView',
          settings: {},
          filter,
          sort: [],
          access_level: BoardViewAccessLevel.Edit,
        },
      ],
    } as unknown as BoardInfoData;

    const result = formatBoardInfoAsJson(board, null) as any;

    expect(result.board.views[0].filter).toEqual(filter);
  });

  it('should return null filter for views with no filters applied', () => {
    const board: BoardInfoData = {
      ...baseBoard,
      views: [
        {
          id: 'view_2',
          name: 'All Items',
          type: 'TableBoardView',
          settings: {},
          filter: null,
          sort: [],
          access_level: BoardViewAccessLevel.Edit,
        },
      ],
    } as unknown as BoardInfoData;

    const result = formatBoardInfoAsJson(board, null) as any;

    expect(result.board.views[0].filter).toBeNull();
  });

  it('should return an empty views array when board has no views', () => {
    const result = formatBoardInfoAsJson(baseBoard, null) as any;

    expect(result.board.views).toEqual([]);
  });

  it('should return multiple views', () => {
    const board: BoardInfoData = {
      ...baseBoard,
      views: [
        { id: 'view_1', name: 'View A', type: 'TableBoardView', settings: {}, filter: null, sort: [], access_level: BoardViewAccessLevel.Edit },
        { id: 'view_2', name: 'View B', type: 'TableBoardView', settings: {}, filter: null, sort: [], access_level: BoardViewAccessLevel.Edit },
      ],
    } as unknown as BoardInfoData;

    const result = formatBoardInfoAsJson(board, null) as any;

    expect(result.board.views).toHaveLength(2);
  });

  it('should include unmatchedViewNames when provided', () => {
    const result = formatBoardInfoAsJson(baseBoard, null, ['Missing View']) as any;

    expect(result.unmatchedViewNames).toEqual(['Missing View']);
  });
});

describe('normalizeViewName / resolveViewIdsByName', () => {
  it('normalizes case, trim, and escaped ampersands', () => {
    expect(normalizeViewName('  P\\&C Shopping  ')).toBe('p&c shopping');
  });

  it('resolves view names case-insensitively and reports unmatched', () => {
    const { viewIds, unmatchedViewNames } = resolveViewIdsByName(
      [
        { id: '1', name: 'P&C Shopping' },
        { id: '2', name: 'P&C Lost' },
      ],
      ['p\\&c shopping', 'Missing'],
    );

    expect(viewIds).toEqual(['1']);
    expect(unmatchedViewNames).toEqual(['Missing']);
  });
});

describe('GetBoardInfoTool filtering', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  const boardPayload = {
    id: '123',
    name: 'Test Board',
    description: null,
    state: 'active',
    board_kind: 'public',
    permissions: 'everyone',
    url: 'https://monday.com/boards/123',
    updated_at: '2024-01-01',
    hierarchy_type: null,
    item_terminology: 'item',
    items_count: 1,
    items_limit: 100,
    creator: null,
    workspace: null,
    board_folder_id: null,
    columns: [{ id: 'status', title: 'Status', description: null, type: 'status', settings: {}, revision: 'r1' }],
    groups: [],
    owners: [],
    team_owners: [],
    tags: [],
    top_group: null,
    views: [
      {
        id: 'view_1',
        name: 'P&C Shopping',
        type: 'TableBoardView',
        settings: { huge: true },
        filter: { operator: 'AND' },
        sort: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes nested column and view ids through to the GraphQL query', async () => {
    mocks.setResponse({ boards: [boardPayload] });

    await callToolByNameRawAsync('get_board_info', {
      boardId: 123,
      filters: {
        columns: { ids: ['status'] },
        views: { ids: ['view_1'] },
      },
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    expect(mocks.getMockRequest().mock.calls[0][1]).toEqual({
      boardId: '123',
      columnIds: ['status'],
      viewIds: ['view_1'],
      includeColumns: true,
      includeViews: true,
    });
    expect(mocks.getMockRequest().mock.calls[1][2]).toEqual({ versionOverride: 'dev', timeout: 1_000 });
  });

  it('resolves filters.views.names via a lean index query then fetches by id', async () => {
    mocks.setResponses([
      {
        boards: [
          {
            id: '123',
            views: [
              { id: 'view_1', name: 'P&C Shopping' },
              { id: 'view_2', name: 'Other' },
            ],
          },
        ],
      },
      { boards: [boardPayload] },
      { entity_knowledge: null },
    ]);

    const result = await callToolByNameRawAsync('get_board_info', {
      boardId: 123,
      filters: {
        views: { names: ['P\\&C Shopping'] },
      },
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);
    expect(mocks.getMockRequest().mock.calls[1][1]).toEqual({
      boardId: '123',
      columnIds: undefined,
      viewIds: ['view_1'],
      includeColumns: true,
      includeViews: true,
    });

    const parsed = parseToolResult(result);
    expect(parsed.board.views).toHaveLength(1);
    expect(parsed.board.views[0].name).toBe('P&C Shopping');
  });

  it('returns an error listing available views when no filters.views.names match', async () => {
    mocks.setResponse({
      boards: [
        {
          id: '123',
          views: [
            { id: 'view_1', name: 'P&C Shopping' },
            { id: 'view_2', name: 'P&C Lost' },
          ],
        },
      ],
    });

    const result = await callToolByNameRawAsync('get_board_info', {
      boardId: 123,
      filters: {
        views: { names: ['Does Not Exist'] },
      },
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toContain('None of the requested view names matched');
    expect(result.content[0].text).toContain('P&C Shopping');
    expect(result.content[0].text).toContain('P&C Lost');
  });

  it('skips the views selection when filters.columns.only is true', async () => {
    mocks.setResponse({ boards: [{ ...boardPayload, views: undefined }] });

    await callToolByNameRawAsync('get_board_info', {
      boardId: 123,
      filters: {
        columns: { ids: ['status'], only: true },
      },
    });

    expect(mocks.getMockRequest().mock.calls[0][1]).toEqual({
      boardId: '123',
      columnIds: ['status'],
      viewIds: undefined,
      includeColumns: true,
      includeViews: false,
    });
  });

  it('skips the columns selection when filters.views.only is true', async () => {
    mocks.setResponse({ boards: [{ ...boardPayload, columns: undefined }] });

    await callToolByNameRawAsync('get_board_info', {
      boardId: 123,
      filters: {
        views: { ids: ['view_1'], only: true },
      },
    });

    expect(mocks.getMockRequest().mock.calls[0][1]).toEqual({
      boardId: '123',
      columnIds: undefined,
      viewIds: ['view_1'],
      includeColumns: false,
      includeViews: true,
    });
  });

  it('fetches board knowledge in parallel with board info', async () => {
    let resolveBoard: (value: unknown) => void;
    let resolveKnowledge: (value: unknown) => void;
    const boardResponse = new Promise((resolve) => {
      resolveBoard = resolve;
    });
    const knowledgeResponse = new Promise((resolve) => {
      resolveKnowledge = resolve;
    });
    mocks.getMockRequest().mockReturnValueOnce(boardResponse).mockReturnValueOnce(knowledgeResponse);

    const resultPromise = callToolByNameRawAsync('get_board_info', { boardId: 123 });
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

    resolveBoard!({ boards: [boardPayload] });
    resolveKnowledge!({
      entity_knowledge: {
        summary: 'Engineering delivery',
        status: EntityKnowledgeStatus.Fresh,
        age_seconds: 30,
        sections: [
          {
            key: EntityKnowledgeSectionKey.BusinessContext,
            title: 'Business Context',
            kind: EntityKnowledgeSectionKind.Structured,
            confidence: 0.9,
            body_markdown: null,
            data: { goal: 'Ship product work' },
          },
        ],
      },
    });

    const parsed = parseToolResult(await resultPromise);
    expect(parsed.knowledge).toEqual({
      summary: 'Engineering delivery',
      status: EntityKnowledgeStatus.Fresh,
      ageSeconds: 30,
      sections: [
        {
          key: EntityKnowledgeSectionKey.BusinessContext,
          title: 'Business Context',
          kind: EntityKnowledgeSectionKind.Structured,
          confidence: 0.9,
          bodyMarkdown: null,
          data: { goal: 'Ship product work' },
        },
      ],
    });
  });

  it('returns board info when the knowledge request fails', async () => {
    mocks
      .getMockRequest()
      .mockResolvedValueOnce({ boards: [boardPayload] })
      .mockRejectedValueOnce(new Error('Knowledge unavailable'));

    const result = await callToolByNameRawAsync('get_board_info', { boardId: 123 });
    const parsed = parseToolResult(result);

    expect(parsed.board.id).toBe('123');
    expect(parsed.knowledge).toBeNull();
  });

  it('skips and omits board knowledge when the feature flag is disabled', async () => {
    const flagChecker = jest.fn().mockReturnValue(false);
    mocks.setResponse({ boards: [boardPayload] });

    const result = await callToolByNameRawAsync(
      'get_board_info',
      { boardId: 123 },
      { mondayApiToken: 'test-token', flagChecker },
    );
    const parsed = parseToolResult(result);

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    expect(parsed).not.toHaveProperty('knowledge');
    expect(flagChecker).toHaveBeenCalledWith(GET_BOARD_INFO_ENTITY_KNOWLEDGE_FLAG);
  });

  it('does not advertise board knowledge when the feature flag is disabled', () => {
    const tool = new GetBoardInfoTool(mocks.mockApiClient, 'test-token', { flagChecker: () => false });

    expect(tool.getDescription()).not.toContain('generated board knowledge');
  });
});
