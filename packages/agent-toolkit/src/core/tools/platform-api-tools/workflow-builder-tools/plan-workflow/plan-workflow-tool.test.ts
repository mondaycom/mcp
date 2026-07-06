import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { WORKFLOW_PLANNER_AGENT_URL } from '../constants';

function mockFetchResponse({
  ok = true,
  status = 200,
  body = {},
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
} = {}): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('PlanWorkflowTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('posts to the workflow-planner agent URL with correct body and Authorization header', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: { result: '# Process Plan\n\n## Overview\nThis process requires 2 workflows.' },
      }),
    );

    await callToolByNameRawAsync('plan_workflow', {
      prompt: 'When a deal is marked Won, create a task in the onboarding board and notify the account manager',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(WORKFLOW_PLANNER_AGENT_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'test-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({
      prompt: 'When a deal is marked Won, create a task in the onboarding board and notify the account manager',
    });
  });

  it('passes through the agent result on success', async () => {
    const planResult = '# Process Plan\n\n## Overview\nThis process requires 2 workflows.';
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: { result: planResult },
      }),
    );

    const result = await callToolByNameRawAsync('plan_workflow', {
      prompt: 'When a deal is marked Won, notify the account manager',
    });
    const parsed = parseToolResult(result);

    expect(parsed.result).toBe(planResult);
  });

  it('rejects empty prompt before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('plan_workflow', {
      prompt: '   ',
    });

    expect(result.content[0].text).toContain('prompt must be a non-empty string');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects prompt exceeding 2000 characters before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('plan_workflow', {
      prompt: 'a'.repeat(2001),
    });

    expect(result.content[0].text).toContain('prompt must not exceed 2000 characters');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('surfaces the error envelope on 4xx', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 400,
        body: { error: 'Prompt exceeds maximum length of 2000 characters', code: 'PROMPT_TOO_LONG' },
      }),
    );

    const result = await callToolByNameRawAsync('plan_workflow', {
      prompt: 'build an onboarding workflow',
    });

    expect(result.content[0].text).toContain('Failed to plan workflow');
    expect(result.content[0].text).toContain('HTTP 400');
    expect(result.content[0].text).toContain('PROMPT_TOO_LONG');
  });

  it('wraps network errors with operation context', async () => {
    fetchSpy.mockRejectedValue(new Error('network failure'));

    const result = await callToolByNameRawAsync('plan_workflow', {
      prompt: 'build an onboarding workflow',
    });

    expect(result.content[0].text).toContain('Failed to plan workflow');
    expect(result.content[0].text).toContain('network failure');
  });
});
