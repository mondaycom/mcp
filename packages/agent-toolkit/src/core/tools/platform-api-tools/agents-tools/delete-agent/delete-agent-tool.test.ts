import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { DeleteAgentMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('DeleteAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockDeletedAgent = {
    id: '5',
    kind: 'PERSONAL',
    state: 'DELETED',
    profile: {
      name: 'Old Agent',
      role: 'Retired',
      role_description: null,
      avatar_url: 'https://example.com/o.png',
      background_color: null,
    },
    goal: null,
    plan: null,
    user_prompt: null,
    version_id: '1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-29T00:00:00Z',
  };

  it('should return the deleted agent', async () => {
    mocks.setResponseOnce({ delete_agent: mockDeletedAgent } as DeleteAgentMutation);

    const result = await callToolByNameRawAsync('delete_agent', { id: '5' });
    const parsed = parseToolResult(result);

    expect(parsed.agent).toEqual(mockDeletedAgent);
  });

  it('should pass versionOverride dev', async () => {
    mocks.setResponseOnce({ delete_agent: mockDeletedAgent } as DeleteAgentMutation);

    await callToolByNameRawAsync('delete_agent', { id: '5' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('deleteAgent'),
      { id: '5' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Not authorized');

    const result = await callToolByNameRawAsync('delete_agent', { id: '5' });

    expect(result.content[0].text).toContain('Failed to delete monday platform agent');
  });

  it('should throw a "returned no id" error when delete_agent has no id', async () => {
    mocks.setResponseOnce({ delete_agent: null } as DeleteAgentMutation);

    const result = await callToolByNameRawAsync('delete_agent', { id: '5' });

    expect(result.content[0].text).toContain('returned no id');
  });

  it('should include the deleted-agent id in the success message', async () => {
    mocks.setResponseOnce({ delete_agent: mockDeletedAgent } as DeleteAgentMutation);

    const result = await callToolByNameRawAsync('delete_agent', { id: '5' });
    const parsed = parseToolResult(result);

    expect(parsed.message).toContain('5');
    expect(parsed.message).toContain('deleted');
  });

  it('should reject whitespace-only id', async () => {
    const result = await callToolByNameRawAsync('delete_agent', { id: '   ' });

    expect(result.content[0].text).toContain('Agent id must be a non-empty string');
  });
});
