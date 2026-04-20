import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { z } from 'zod';
import { trackEvent } from '../../../utils/tracking.utils';

jest.mock('../../../utils/tracking.utils');

const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

const testSchema = {
  input: z.string().describe('test input'),
};

class TestTool extends BaseMondayApiTool<typeof testSchema> {
  name = 'test_tool';
  type = ToolType.READ;
  annotations: ToolAnnotations = { readOnlyHint: true };

  getDescription() {
    return 'test tool';
  }
  getInputSchema() {
    return testSchema;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    return { content: 'success' } as any;
  }
}

class FailingTool extends BaseMondayApiTool<typeof testSchema> {
  name = 'failing_tool';
  type = ToolType.WRITE;
  annotations: ToolAnnotations = {};

  getDescription() {
    return 'fails';
  }
  getInputSchema() {
    return testSchema;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    throw new Error('tool failed');
  }
}

describe('BaseMondayApiTool tracking', () => {
  const mockApi = { request: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks successful execution', async () => {
    const tool = new TestTool(mockApi);

    await tool.execute({ input: 'hello' });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const call = mockTrackEvent.mock.calls[0][0];
    expect(call.name).toBe('monday_api_mcp_tool_execution');
    expect(call.data).toEqual({
      toolName: 'test_tool',
      executionTimeMs: expect.any(Number),
      isError: false,
      toolType: 'monday_api_tool',
    });
  });

  it('tracks failed execution with isError=true', async () => {
    const tool = new FailingTool(mockApi);

    await expect(tool.execute({ input: 'hello' })).rejects.toThrow('tool failed');

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].data.isError).toBe(true);
  });

  it('does not affect execution when tracking throws', async () => {
    mockTrackEvent.mockImplementation(() => {
      throw new Error('tracking failed');
    });
    const tool = new TestTool(mockApi);

    const result = await tool.execute({ input: 'hello' });

    expect(result.content).toBe('success');
  });

  it('measures execution time', async () => {
    const tool = new TestTool(mockApi);

    await tool.execute({ input: 'hello' });

    const data = mockTrackEvent.mock.calls[0][0].data;
    expect(data.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
