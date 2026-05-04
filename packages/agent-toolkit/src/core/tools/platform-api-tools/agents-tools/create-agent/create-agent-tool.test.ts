import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { CreateAgentMutation, CreateBlankAgentMutation } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('CreateAgentTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockAgent = {
    id: '42',
    kind: 'PERSONAL',
    state: 'INACTIVE',
    profile: {
      name: 'Generated Agent',
      role: 'Helper',
      role_description: 'Helps with things',
      avatar_url: 'https://example.com/g.png',
      background_color: null,
    },
    goal: 'Help',
    plan: '# Plan',
    user_prompt: 'Make a helper',
    version_id: '1',
    created_at: null,
    updated_at: null,
  };

  const mockBlankAgent = {
    id: '7',
    kind: 'PERSONAL',
    state: 'INACTIVE',
    profile: {
      name: 'Blank',
      role: 'Helper',
      role_description: null,
      avatar_url: 'https://example.com/x.png',
      background_color: null,
    },
    goal: null,
    plan: null,
    user_prompt: null,
    version_id: '1',
    created_at: null,
    updated_at: null,
  };

  it('should return the created agent', async () => {
    mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

    const result = await callToolByNameRawAsync('create_agent', { prompt: 'Make a helper' });
    const parsed = parseToolResult(result);

    expect(parsed.agent).toEqual(mockAgent);
  });

  it('should pass versionOverride dev', async () => {
    mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

    await callToolByNameRawAsync('create_agent', { prompt: 'Make a helper' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createAgent'),
      expect.objectContaining({ input: expect.objectContaining({ prompt: 'Make a helper' }) }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should forward optional agent_model', async () => {
    mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

    await callToolByNameRawAsync('create_agent', { prompt: 'Make a helper', agent_model: 'claude-sonnet' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { input: { prompt: 'Make a helper', agent_model: 'claude-sonnet' } },
      expect.anything(),
    );
  });

  it('should trim prompt before sending to API', async () => {
    mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

    await callToolByNameRawAsync('create_agent', { prompt: '  Make a helper  ' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { input: { prompt: 'Make a helper', agent_model: undefined } },
      expect.anything(),
    );
  });

  it('should create blank agent when prompt is omitted', async () => {
    mocks.setResponseOnce({ create_blank_agent: mockBlankAgent } as CreateBlankAgentMutation);

    const result = await callToolByNameRawAsync('create_agent', {});
    const parsed = parseToolResult(result);

    expect(parsed.agent).toEqual(mockBlankAgent);
  });

  it('should call createBlankAgent with empty input when no fields are provided', async () => {
    mocks.setResponseOnce({ create_blank_agent: mockBlankAgent } as CreateBlankAgentMutation);

    await callToolByNameRawAsync('create_agent', {});

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createBlankAgent'),
      { input: {} },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should forward manual profile fields in blank mode', async () => {
    mocks.setResponseOnce({ create_blank_agent: mockBlankAgent } as CreateBlankAgentMutation);

    await callToolByNameRawAsync('create_agent', {
      name: 'My Agent',
      role: 'Tester',
      gender: 'female',
      background_color: '#000000',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('createBlankAgent'),
      { input: { name: 'My Agent', role: 'Tester', gender: 'female', background_color: '#000000' } },
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should reject mixed prompt and manual fields', async () => {
    const result = await callToolByNameRawAsync('create_agent', { prompt: 'make agent', name: 'Manual Name' });

    expect(result.content[0].text).toContain('either prompt mode or manual mode');
  });

  it('should reject agent_model without prompt', async () => {
    const result = await callToolByNameRawAsync('create_agent', { agent_model: 'claude-sonnet' });

    expect(result.content[0].text).toContain('agent_model can only be used when prompt is provided');
  });

  it('should reject whitespace-only prompt', async () => {
    const result = await callToolByNameRawAsync('create_agent', { prompt: '   ' });

    expect(result.content[0].text).toContain('Prompt must be a non-empty string');
  });

  it('should propagate GraphQL errors with operation context', async () => {
    mocks.setError('Quota exceeded');

    const result = await callToolByNameRawAsync('create_agent', { prompt: 'x' });

    expect(result.content[0].text).toContain('Failed to create monday platform agent');
  });

  it('should throw a "returned no id" error when create_agent has no id', async () => {
    mocks.setResponseOnce({ create_agent: null } as CreateAgentMutation);

    const result = await callToolByNameRawAsync('create_agent', { prompt: 'x' });

    expect(result.content[0].text).toContain('returned no id');
  });

  it('should include INACTIVE activation hint in the success message', async () => {
    mocks.setResponseOnce({ create_agent: mockAgent } as CreateAgentMutation);

    const result = await callToolByNameRawAsync('create_agent', { prompt: 'Make a helper' });
    const parsed = parseToolResult(result);

    expect(parsed.message).toContain('INACTIVE');
    expect(parsed.message).toContain('activate');
  });
});
