import { createMockApiClient } from './test-utils/mock-api-client';
import { CheckTemplateStatusTool } from './check-template-status-tool';

describe('CheckTemplateStatusTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('returns expired message when status is null', async () => {
    mocks.setResponse({ use_template_status: null });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatch(/invalid or has expired/i);
  });

  it('returns failure message when status=FAILED', async () => {
    mocks.setResponse({
      use_template_status: { status: 'FAILED', is_failed: true, is_complete: false, board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatch(/failed/i);
  });

  it('returns structured content with board_ids and board_ids_map on COMPLETE', async () => {
    mocks.setResponse({
      use_template_status: {
        status: 'COMPLETE',
        board_ids: ['10', '20'],
        board_ids_map: { '1': '10', '2': '20' },
      },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({
      status: 'COMPLETE',
      board_ids: ['10', '20'],
      board_ids_map: { '1': '10', '2': '20' },
    });
  });

  it('returns null board_ids_map when absent on COMPLETE', async () => {
    mocks.setResponse({
      use_template_status: { status: 'COMPLETE', board_ids: ['10'], board_ids_map: null },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ board_ids_map: null });
  });

  it('returns the non-terminal status string for PENDING and IN_PROGRESS', async () => {
    mocks.setResponse({
      use_template_status: { status: 'IN_PROGRESS', board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatch(/in_progress/i);
  });

  it('returns an unexpected-status message for unknown status values', async () => {
    mocks.setResponse({
      use_template_status: { status: 'CANCELLING' as any, board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatch(/unexpected status/i);
  });
});
