import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { UpdateAgentMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

const mockAgent = {
  id: '7',
  kind: null,
  state: null,
  goal: null,
  plan: null,
  user_prompt: null,
  version_id: 'v1',
  created_at: null,
  updated_at: null,
  profile: {
    name: 'Updated Agent',
    role: 'Test Role',
    role_description: 'A test agent',
    avatar_url: null,
    background_color: null,
  },
};

describe('UpdateAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  it('should update agent name — happy path', async () => {
    mocks.setResponseOnce({ update_agent: { ...mockAgent } } as UpdateAgentMutation);

    const result = await callToolByNameRawAsync('update_agent', { id: '7', name: 'Updated Agent' });
    const parsed = parseToolResult(result);

    expect(parsed.id).toBe('7');
  });

  it('should update multiple fields — happy path', async () => {
    mocks.setResponseOnce({ update_agent: { ...mockAgent } } as UpdateAgentMutation);

    const result = await callToolByNameRawAsync('update_agent', { id: '7', name: 'X', plan: 'step 1' });

    expect(mocks.getMockRequest()).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should only include provided fields in input object', async () => {
    mocks.setResponseOnce({ update_agent: { ...mockAgent } } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', name: 'X' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: { name: 'X' } }),
      expect.anything(),
    );
  });

  it('should not include omitted fields in input object', async () => {
    mocks.setResponseOnce({ update_agent: { ...mockAgent } } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', role: 'Bot' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: { role: 'Bot' } }),
      expect.anything(),
    );

    const callArgs = mocks.getMockRequest().mock.calls[0];
    const variables = callArgs[1] as { input: Record<string, unknown> };
    expect(variables.input).not.toHaveProperty('name');
  });

  it('should pass versionOverride dev', async () => {
    mocks.setResponseOnce({ update_agent: { ...mockAgent } } as UpdateAgentMutation);

    await callToolByNameRawAsync('update_agent', { id: '7', name: 'X' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate API errors with context', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('update_agent', { id: '7', name: 'X' });

    expect(result.content[0].text).toContain('Failed to update monday platform agent');
  });
});
