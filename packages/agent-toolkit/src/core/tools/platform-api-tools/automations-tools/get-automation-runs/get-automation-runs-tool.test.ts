import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

describe('GetAutomationRunsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockTriggerEvent = {
    triggerUuid: 'uuid-123',
    eventState: 'success',
    eventKind: 'automation',
    triggerStartedAt: '2026-06-01T10:00:00Z',
    createdAt: '2026-06-01T10:00:00Z',
    triggerDuration: 1500,
    errorReason: null,
    entityKind: 'item',
    hostType: 'board',
    hostInstanceId: '999',
    billingActionsCount: 1,
    creatorAppFeatureReferenceId: null,
    waitingForTriggerName: null,
    reignitionSubscriptionId: null,
  };

  describe('history mode', () => {
    it('should return paginated run history for a board', async () => {
      mocks.setResponseOnce({ trigger_events: { triggerEvents: [mockTriggerEvent] } });

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        boardId: '1234',
      });
      const parsed = parseToolResult(result);

      expect(parsed.count).toBe(1);
      expect(parsed.runs).toEqual([mockTriggerEvent]);
      expect(parsed.scope).toBe('board 1234');
      expect(parsed.message).toContain('1 run(s)');
    });

    it('should pass boardId in filters and offset to the query', async () => {
      mocks.setResponseOnce({ trigger_events: { triggerEvents: [] } });

      await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        boardId: '5678',
        nextPageOffset: 10,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('trigger_events'),
        { nextPageOffset: 10, filters: { boardId: '5678' } },
      );
    });

    it('should support account-wide queries', async () => {
      mocks.setResponseOnce({ trigger_events: { triggerEvents: [mockTriggerEvent, mockTriggerEvent] } });

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        accountWide: true,
      });
      const parsed = parseToolResult(result);

      expect(parsed.scope).toBe('account-wide');
      expect(parsed.count).toBe(2);
    });

    it('should pass filters through to the query', async () => {
      mocks.setResponseOnce({ trigger_events: { triggerEvents: [] } });

      await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        accountWide: true,
        filters: { stateFilter: ['failure'], automationIds: [1, 2] },
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('trigger_events'),
        { nextPageOffset: 0, filters: { stateFilter: ['failure'], automationIds: [1, 2] } },
      );
    });

    it('should count runs by state', async () => {
      mocks.setResponseOnce({
        trigger_events: {
          triggerEvents: [
            { ...mockTriggerEvent, eventState: 'success' },
            { ...mockTriggerEvent, eventState: 'failure' },
            { ...mockTriggerEvent, eventState: 'success' },
          ],
        },
      });

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        boardId: '1',
      });
      const parsed = parseToolResult(result);

      expect(parsed.stateCounts).toEqual({ success: 2, failure: 1 });
    });
  });

  describe('detail mode', () => {
    it('should return run detail with block and tool events', async () => {
      const mockBlockEvent = { atomicActionId: 'a1', title: 'Send email', eventState: 'success' };
      const mockToolEvent = { id: 't1', tool_name: 'create_item', event_status: 'success' };

      mocks.setResponses([
        { trigger_event: mockTriggerEvent },
        { block_events: { blockEvents: [mockBlockEvent] } },
        { tool_events: { tool_events: [mockToolEvent] } },
      ]);

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'detail',
        boardId: '1',
        triggerUuid: 'uuid-123',
      });
      const parsed = parseToolResult(result);

      expect(parsed.found).toBe(true);
      expect(parsed.run).toEqual(mockTriggerEvent);
      expect(parsed.blockEvents).toEqual([mockBlockEvent]);
      expect(parsed.toolEvents).toEqual([mockToolEvent]);
      expect(parsed.toolEventsIncluded).toBe(true);
    });

    it('should return not-found when trigger does not exist', async () => {
      mocks.setResponseOnce({ trigger_event: null });

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'detail',
        boardId: '1',
        triggerUuid: 'missing-uuid',
      });
      const parsed = parseToolResult(result);

      expect(parsed.found).toBe(false);
      expect(parsed.message).toContain('No run found');
    });

    it('should reject detail mode without triggerUuid', async () => {
      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'detail',
        boardId: '1',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('triggerUuid');
    });

    it('should skip tool events when includeToolEvents is false', async () => {
      mocks.setResponses([
        { trigger_event: mockTriggerEvent },
        { block_events: { blockEvents: [] } },
      ]);

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'detail',
        boardId: '1',
        triggerUuid: 'uuid-123',
        includeToolEvents: false,
      });
      const parsed = parseToolResult(result);

      expect(parsed.toolEventsIncluded).toBe(false);
      expect(parsed.toolEvents).toEqual([]);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);
    });
  });

  describe('scope validation', () => {
    it('should reject when neither boardId nor accountWide is provided', async () => {
      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
      });
      const parsed = parseToolResult(result);

      expect(parsed.message).toContain('boardId');
      expect(parsed.message).toContain('accountWide');
    });
  });

  describe('error handling', () => {
    it('should propagate GraphQL errors with context', async () => {
      mocks.setError('Not authorized');

      const result = await callToolByNameRawAsync('get_automation_runs', {
        mode: 'history',
        boardId: '1',
      });

      expect(result.content[0].text).toContain('Failed to get automation runs');
    });
  });
});
