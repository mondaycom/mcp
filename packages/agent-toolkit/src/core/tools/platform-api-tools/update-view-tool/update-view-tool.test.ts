import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import {
  ViewKind,
  ItemsQueryRuleOperator,
  ItemsQueryOperator,
  ItemsOrderByDirection,
} from 'src/monday-graphql/generated/graphql/graphql';

describe('UpdateViewTool', () => {
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
    it('should update a view with minimal parameters', async () => {
      mocks.setResponse({
        update_view: {
          id: 'view_123',
          name: 'Existing View',
          type: 'BoardTableView',
        },
      });

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_123',
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('View "Existing View"');
      expect(result.content[0].text).toContain('ID: view_123');
      expect(result.content[0].text).toContain('successfully updated');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1]).toEqual({
        viewId: 'view_123',
        boardId: '123',
        type: ViewKind.Table,
        name: undefined,
        filter: undefined,
        sort: undefined,
        settings: undefined,
      });
    });

    it('should update a view name', async () => {
      mocks.setResponse({
        update_view: {
          id: 'view_456',
          name: 'Renamed View',
          type: 'BoardTableView',
        },
      });

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_456',
        boardId: '123',
        type: ViewKind.Table,
        name: 'Renamed View',
      });

      expect(result.content[0].text).toContain('View "Renamed View"');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].name).toBe('Renamed View');
    });

    it('should update a view filter', async () => {
      mocks.setResponse({
        update_view: {
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

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_789',
        boardId: '123',
        type: ViewKind.Table,
        filter,
      });

      expect(result.content[0].text).toContain('successfully updated');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].filter).toEqual(filter);
    });

    it('should pass settings through as freeform JSON', async () => {
      mocks.setResponse({
        update_view: {
          id: 'view_settings',
          name: 'Custom View',
          type: 'BoardAppView',
        },
      });

      const settings = { app_feature_id: 'feat_42', custom: { hidden: ['col_a'] } };

      await callToolByNameRawAsync('update_view', {
        viewId: 'view_settings',
        boardId: '123',
        type: ViewKind.App,
        settings,
      });

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].settings).toEqual(settings);
    });

    it('should update a view sort', async () => {
      mocks.setResponse({
        update_view: {
          id: 'view_101',
          name: 'Sorted View',
          type: 'BoardTableView',
        },
      });

      const sort = [{ column_id: 'date', direction: ItemsOrderByDirection.Desc }];

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_101',
        boardId: '123',
        type: ViewKind.Table,
        sort,
      });

      expect(result.content[0].text).toContain('successfully updated');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].sort).toEqual(sort);
    });
  });

  describe('Error Cases', () => {
    it('should return error when API returns null', async () => {
      mocks.setResponse({ update_view: null });

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_123',
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toBe('Failed to update view - no response from API');
    });

    it('should handle GraphQL request exception', async () => {
      mocks.setError('Network error: Connection timeout');

      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_123',
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('Network error: Connection timeout');
    });

    it('should fail validation when viewId is missing', async () => {
      const result = await callToolByNameRawAsync('update_view', {
        boardId: '123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should fail validation when boardId is missing', async () => {
      const result = await callToolByNameRawAsync('update_view', {
        viewId: 'view_123',
        type: ViewKind.Table,
      });

      expect(result.content[0].text).toContain('Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });
});
