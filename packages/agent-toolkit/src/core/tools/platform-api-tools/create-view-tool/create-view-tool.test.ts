import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import {
  ViewKind,
  ItemsQueryRuleOperator,
  ItemsQueryOperator,
  ItemsOrderByDirection,
} from 'src/monday-graphql/generated/graphql/graphql';

describe('CreateViewTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should create a view with minimal parameters', async () => {
      mocks.setResponse({
        create_view: {
          id: 'view_123',
          name: 'New View',
          type: 'BoardTableView',
        },
      });

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('View "New View"');
      expect(result.content[0].text).toContain('ID: view_123');
      expect(result.content[0].text).toContain('successfully created');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1]).toEqual({
        boardId: '123',
        type: ViewKind.Table,
        name: undefined,
        filter: undefined,
        sort: undefined,
      });
    });

    it('should create a view with a name', async () => {
      mocks.setResponse({
        create_view: {
          id: 'view_456',
          name: 'High Priority Items',
          type: 'BoardTableView',
        },
      });

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
        name: 'High Priority Items',
      });

      expect(result.content[0].text).toContain('View "High Priority Items"');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].name).toBe('High Priority Items');
    });

    it('should create a view with filter configuration', async () => {
      mocks.setResponse({
        create_view: {
          id: 'view_789',
          name: 'Filtered View',
          type: 'BoardTableView',
        },
      });

      const filter = {
        rules: [
          {
            column_id: 'status',
            compare_value: [1],
            operator: ItemsQueryRuleOperator.AnyOf,
          },
        ],
        operator: ItemsQueryOperator.And,
      };

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
        name: 'Filtered View',
        filter,
      });

      expect(result.content[0].text).toContain('successfully created');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].filter).toEqual(filter);
    });

    it('should create a view with sort configuration', async () => {
      mocks.setResponse({
        create_view: {
          id: 'view_101',
          name: 'Sorted View',
          type: 'BoardTableView',
        },
      });

      const sort = [{ column_id: 'date', direction: ItemsOrderByDirection.Desc }];

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
        name: 'Sorted View',
        sort,
      });

      expect(result.content[0].text).toContain('successfully created');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].sort).toEqual(sort);
    });
  });

  describe('Error Cases', () => {
    it('should return error when API returns null', async () => {
      mocks.setResponse({ create_view: null });

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toBe('Failed to create view - no response from API');
    });

    it('should handle GraphQL request exception', async () => {
      mocks.setError('Network error: Connection timeout');

      const result = await callToolByNameRawAsync('create_view', {
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('Network error: Connection timeout');
    });

    it('should fail validation when boardId is missing', async () => {
      const result = await callToolByNameRawAsync('create_view', {
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });
});
