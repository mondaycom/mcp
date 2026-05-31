import { createMockApiClient } from './test-utils/mock-api-client';
import { CheckTemplateStatusTool } from './check-template-status-tool';

describe('CheckTemplateStatusTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('returns null status with expiry message when process_id is not found', async () => {
    mocks.setResponse({ template_installation_status: null });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: null });
    expect((out.content as any).message).toMatch(/invalid or has expired/i);
  });

  it('returns FAILED status with structured content', async () => {
    mocks.setResponse({
      template_installation_status: { status: 'FAILED', board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: 'FAILED', board_ids: [], board_ids_map: null });
    expect((out.content as any).message).toMatch(/failed/i);
  });

  it('returns structured content with board_ids and board_ids_map on COMPLETE', async () => {
    mocks.setResponse({
      template_installation_status: {
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
      template_installation_status: { status: 'COMPLETE', board_ids: ['10'], board_ids_map: null },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: 'COMPLETE', board_ids_map: null });
  });

  it('returns IN_PROGRESS status with "in progress" message', async () => {
    mocks.setResponse({
      template_installation_status: { status: 'IN_PROGRESS', board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: 'IN_PROGRESS', board_ids: [], board_ids_map: null });
    expect((out.content as any).message).toMatch(/in progress/i);
  });

  it('returns PENDING status with structured content', async () => {
    mocks.setResponse({
      template_installation_status: { status: 'PENDING', board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: 'PENDING', board_ids: [], board_ids_map: null });
    expect((out.content as any).message).toMatch(/pending/i);
  });

  it('returns unexpected-status structured content for unknown status values', async () => {
    mocks.setResponse({
      template_installation_status: { status: 'CANCELLING' as any, board_ids: [] },
    });
    const tool = new CheckTemplateStatusTool(mocks.mockApiClient);

    const out = await tool.execute({ processId: 'pid-1' });
    expect(out.content).toMatchObject({ status: 'CANCELLING' });
    expect((out.content as any).message).toMatch(/unexpected status/i);
  });
});
