import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';

const LITE_BUILDER_URL = 'https://api.monday.com/platform-ai-gateway/agents/lite-builder';

function mockFetchResponse({
  ok = true,
  status = 200,
  body = {},
  contentType = 'application/json',
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  contentType?: string;
} = {}): Response {
  return {
    ok,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('CreateAutomationTool', () => {
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

  it('posts to the lite-builder agent URL with userPrompt and Authorization header', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: { status: 'activated', workflowId: 7, boardId: 12345, workflow: {} },
      }),
    );

    await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Notify me when status changes to Done on board 12345',
      boardId: '12345',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(LITE_BUILDER_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'test-token',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({
      userPrompt: 'Notify me when status changes to Done on board 12345',
      boardId: '12345',
    });
  });

  it('rejects missing boardId before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Notify someone when something happens',
    });

    expect(result.content[0].text).toContain('boardId');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('passes through an "activated" outcome', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: {
          status: 'activated',
          workflowId: 7,
          boardId: 12345,
          workflow: { title: 'Notify me' },
        },
      }),
    );

    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Create a notify workflow',
      boardId: '12345',
    });
    const parsed = parseToolResult(result);

    expect(parsed.status).toBe('activated');
    expect(parsed.workflowId).toBe(7);
    expect(parsed.boardId).toBe(12345);
  });

  it('passes through a "needs_clarification" outcome', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        body: {
          status: 'needs_clarification',
          unresolvedFields: [{ blockReferenceId: 1, fieldKey: 'columnId' }],
          partialWorkflow: { title: 'partial' },
        },
      }),
    );

    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Notify me',
      boardId: '12345',
    });
    const parsed = parseToolResult(result);

    expect(parsed.status).toBe('needs_clarification');
    expect(parsed.unresolvedFields).toHaveLength(1);
  });

  it('surfaces the lite-builder error envelope on 4xx', async () => {
    fetchSpy.mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 400,
        body: { error: 'Bad prompt', code: 'PROMPT_INVALID', reason: { detail: 'too short' } },
      }),
    );

    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'x',
      boardId: '12345',
    });

    expect(result.content[0].text).toContain('Failed to create automation');
    expect(result.content[0].text).toContain('HTTP 400');
    expect(result.content[0].text).toContain('PROMPT_INVALID');
    expect(result.content[0].text).toContain('Bad prompt');
  });

  it('wraps network/timeout errors with operation context', async () => {
    fetchSpy.mockRejectedValue(new Error('network failure'));

    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Notify me when status changes',
      boardId: '12345',
    });

    expect(result.content[0].text).toContain('Failed to create automation');
    expect(result.content[0].text).toContain('network failure');
  });

  it('rejects an empty userPrompt before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: '   ',
      boardId: '12345',
    });

    expect(result.content[0].text).toContain('userPrompt must be a non-empty string');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only boardId before making any HTTP call', async () => {
    const result = await callToolByNameRawAsync('create_automation', {
      userPrompt: 'Notify me when status changes to Done',
      boardId: '   ',
    });

    expect(result.content[0].text).toContain('boardId must be a non-empty string');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
