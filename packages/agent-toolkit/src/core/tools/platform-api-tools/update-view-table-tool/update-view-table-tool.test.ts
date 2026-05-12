import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import {
  ItemsQueryRuleOperator,
  ItemsQueryOperator,
  ItemsOrderByDirection,
  SortDirection,
} from 'src/monday-graphql/generated/graphql/graphql';

describe('UpdateViewTableTool', () => {
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
    it('should update a table view with minimal parameters', async () => {
      mocks.setResponse({
        update_view_table: {
          id: 'view_123',
          name: 'Existing Table',
          type: 'BoardTableView',
        },
      });

      const result = await callToolByNameRawAsync('update_view_table', {
        viewId: 'view_123',
        boardId: '123',
      });

      expect(result.content[0].text).toContain('Table view "Existing Table"');
      expect(result.content[0].text).toContain('successfully updated');

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1]).toEqual({
        viewId: 'view_123',
        boardId: '123',
        name: undefined,
        filter: undefined,
        sort: undefined,
        tags: undefined,
        settings: undefined,
      });
    });

    it('should update a table view with filter, sort, tags, and settings', async () => {
      mocks.setResponse({
        update_view_table: {
          id: 'view_456',
          name: 'Updated Table',
          type: 'BoardTableView',
        },
      });

      const filter = {
        rules: [{ column_id: 'status', compare_value: [1], operator: ItemsQueryRuleOperator.AnyOf }],
        operator: ItemsQueryOperator.And,
      };
      const sort = [{ column_id: 'date', direction: ItemsOrderByDirection.Desc }];
      const tags = ['priority'];
      const settings = {
        columns: {
          column_properties: [{ column_id: 'status', visible: false }],
        },
        group_by: {
          conditions: [
            { columnId: 'status', config: { sortSettings: { direction: SortDirection.Desc } } },
          ],
          hideEmptyGroups: false,
        },
      };

      await callToolByNameRawAsync('update_view_table', {
        viewId: 'view_456',
        boardId: '123',
        name: 'Updated Table',
        filter,
        sort,
        tags,
        settings,
      });

      const call = mocks.getMockRequest().mock.calls[0];
      expect(call[1].filter).toEqual(filter);
      expect(call[1].sort).toEqual(sort);
      expect(call[1].tags).toEqual(tags);
      expect(call[1].settings).toEqual(settings);
    });
  });

  describe('Error Cases', () => {
    it('should return error when API returns null', async () => {
      mocks.setResponse({ update_view_table: null });

      const result = await callToolByNameRawAsync('update_view_table', {
        viewId: 'view_123',
        boardId: '123',
      });

      expect(result.content[0].text).toBe('Failed to update table view - no response from API');
    });

    it('should fail validation when viewId is missing', async () => {
      const result = await callToolByNameRawAsync('update_view_table', { boardId: '123' });

      expect(result.content[0].text).toContain('Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should fail validation when boardId is missing', async () => {
      const result = await callToolByNameRawAsync('update_view_table', { viewId: 'view_123' });

      expect(result.content[0].text).toContain('Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });
});
