import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { GetAgentQuery, ListAgentsQuery } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('GetAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockAgent = {
    id: '1',
    kind: 'PERSONAL',
    state: 'INACTIVE',
    profile: {
      name: 'Daily Standup Bot',
      role: 'Project Manager',
      role_description: 'Runs the daily standup',
      avatar_url: 'https://example.com/avatar.png',
      background_color: '#ffffff',
    },
    goal: 'Keep the team aligned',
    plan: '# Plan\n- collect status',
    user_prompt: 'Make a standup bot',
    version_id: '100',
    created_at: '2026-04-29T00:00:00Z',
    updated_at: '2026-04-29T00:00:00Z',
  };

  it('should fetch a single agent when id is provided', async () => {
    mocks.setResponseOnce({ agent: mockAgent } as GetAgentQuery);

    const result = await callToolByNameRawAsync('get_agent', { id: '1' });
    const parsed = parseToolResult(result);

    expect(parsed.agent).toEqual(mockAgent);
  });

  it('should pass versionOverride dev when fetching a single agent', async () => {
    mocks.setResponseOnce({ agent: mockAgent } as GetAgentQuery);

    await callToolByNameRawAsync('get_agent', { id: '1' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgent'),
      { id: '1' },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should list all agents when id is omitted', async () => {
    const expectedAgents = [mockAgent, { ...mockAgent, id: '2' }];
    mocks.setResponseOnce({ agents: expectedAgents } as ListAgentsQuery);

    const result = await callToolByNameRawAsync('get_agent', {});
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(2);
    expect(parsed.agents).toEqual(expectedAgents);
  });

  it('should pass versionOverride dev when listing agents', async () => {
    mocks.setResponseOnce({ agents: [] } as ListAgentsQuery);

    await callToolByNameRawAsync('get_agent', {});

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('listAgents'),
      {},
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should return a not-found message when single fetch returns null', async () => {
    mocks.setResponseOnce({ agent: null } as GetAgentQuery);

    const result = await callToolByNameRawAsync('get_agent', { id: '999' });

    expect(result.content[0].text).toContain('not found');
  });

  it('should return zero count when no agents exist', async () => {
    mocks.setResponseOnce({ agents: [] } as ListAgentsQuery);

    const result = await callToolByNameRawAsync('get_agent', {});
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(0);
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Unauthorized');

    const result = await callToolByNameRawAsync('get_agent', {});

    expect(result.content[0].text).toContain('Failed to list monday platform agents');
  });

  it('should reject whitespace-only id', async () => {
    const result = await callToolByNameRawAsync('get_agent', { id: '   ' });

    expect(result.content[0].text).toContain('Agent id must be a non-empty string');
  });
});
