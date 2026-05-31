import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { WORKFLOW_BUILDER_AGENT_URL } from '../constants';

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

describe('UpdateWorkflowTool', () => {
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

  it('posts to the workflow-builder agent URL with correct body and Authorization header', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: { workflowObjectId: 5002722216, workflowDraftId: 43023, result: 'Added an email step' },
      }),
    );

    await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: 'add a step that sends an email when an item is created',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(WORKFLOW_BUILDER_AGENT_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'test-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: 'add a step that sends an email when an item is created',
    });
  });

  it('passes through the agent result on success', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: {
          workflowObjectId: 5002722216,
          workflowDraftId: 43023,
          result: 'Added an email notification step after the trigger',
        },
      }),
    );

    const result = await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: 'add an email step',
    });
    const parsed = parseToolResult(result);

    expect(parsed.workflowObjectId).toBe(5002722216);
    expect(parsed.workflowDraftId).toBe(43023);
    expect(parsed.result).toBe('Added an email notification step after the trigger');
  });

  it('rejects missing workflowObjectId before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('update_workflow', {
      workflowDraftId: 43023,
      prompt: 'add a step',
    });

    expect(result.content[0].text).toContain('workflowObjectId');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects missing workflowDraftId before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      prompt: 'add a step',
    });

    expect(result.content[0].text).toContain('workflowDraftId');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects empty prompt before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: '   ',
    });

    expect(result.content[0].text).toContain('prompt must be a non-empty string');
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

    const result = await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: 'add a step',
    });

    expect(result.content[0].text).toContain('Failed to update workflow');
    expect(result.content[0].text).toContain('HTTP 400');
    expect(result.content[0].text).toContain('PROMPT_TOO_LONG');
  });

  it('wraps network errors with operation context', async () => {
    fetchSpy.mockRejectedValue(new Error('network failure'));

    const result = await callToolByNameRawAsync('update_workflow', {
      workflowObjectId: 5002722216,
      workflowDraftId: 43023,
      prompt: 'add a step',
    });

    expect(result.content[0].text).toContain('Failed to update workflow');
    expect(result.content[0].text).toContain('network failure');
  });
});
