import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('GetAutomationStatisticsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  describe('totals breakdown', () => {
    it('should return totals for a board', async () => {
      mocks.setResponseOnce({
        account_trigger_statistics: { id: '1', success: 50, failure: 5, total: 55 },
      });

      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        boardId: '1234',
      });
      const parsed = parseToolResult(result);

      expect(parsed.breakdown).toBe('totals');
      expect(parsed.scope).toBe('board 1234');
      expect(parsed.statistics).toEqual({ id: '1', success: 50, failure: 5, total: 55 });
      expect(parsed.message).toContain('success=50');
      expect(parsed.message).toContain('failure=5');
      expect(parsed.message).toContain('total=55');
    });

    it('should support account-wide totals', async () => {
      mocks.setResponseOnce({
        account_trigger_statistics: { id: '1', success: 100, failure: 10, total: 110 },
      });

      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        accountWide: true,
      });
      const parsed = parseToolResult(result);

      expect(parsed.scope).toBe('account-wide');
    });

    it('should pass boardId as integer and userIds in filters', async () => {
      mocks.setResponseOnce({
        account_trigger_statistics: { id: '1', success: 0, failure: 0, total: 0 },
      });

      await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        boardId: '5678',
        userIds: [1, 2],
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('account_trigger_statistics'),
        { filters: { board_id: 5678, user_ids: [1, 2] } },
      );
    });

    it('should handle null statistics', async () => {
      mocks.setResponseOnce({ account_trigger_statistics: null });

      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        boardId: '1',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('success=0');
      expect(parsed.message).toContain('failure=0');
      expect(parsed.message).toContain('total=0');
    });
  });

  describe('by_entity breakdown', () => {
    it('should return per-entity statistics', async () => {
      const mockStats = {
        id: '1',
        automation_statistics: { '101': { total: 5 } },
        workflow_statistics: { '201': { total: 3 } },
      };
      mocks.setResponseOnce({ account_triggers_statistics_by_entity_id: mockStats });

      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'by_entity',
        boardId: '1234',
        runStatus: 'failure',
      });
      const parsed = parseToolResult(result);

      expect(parsed.breakdown).toBe('by_entity');
      expect(parsed.runStatus).toBe('failure');
      expect(parsed.automationStatistics).toEqual({ '101': { total: 5 } });
      expect(parsed.workflowStatistics).toEqual({ '201': { total: 3 } });
    });

    it('should reject by_entity without runStatus', async () => {
      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'by_entity',
        boardId: '1',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('runStatus');
    });

    it('should pass excludeAutomationIds and userIds in filters', async () => {
      mocks.setResponseOnce({
        account_triggers_statistics_by_entity_id: { id: '1', automation_statistics: {}, workflow_statistics: {} },
      });

      await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'by_entity',
        boardId: '1',
        runStatus: 'success',
        excludeAutomationIds: [10, 20],
        userIds: [5],
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('account_triggers_statistics_by_entity_id'),
        {
          runStatus: 'success',
          filters: { board_id: 1, automation_ids: [10, 20], user_ids: [5] },
        },
      );
    });
  });

  describe('scope validation', () => {
    it('should reject when neither boardId nor accountWide is provided', async () => {
      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('boardId');
      expect(parsed.message).toContain('accountWide');
    });
  });

  describe('error handling', () => {
    it('should propagate GraphQL errors with context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        boardId: '1',
      });

      expect(result.content[0].text).toContain('Failed to get automation statistics');
    });

    it('should reject invalid boardId format', async () => {
      const result = await callToolByNameRawAsync('get_automation_statistics', {
        breakdown: 'totals',
        boardId: 'abc',
      });

      expect(result.content[0].text).toContain('Invalid boardId');
    });
  });
});
