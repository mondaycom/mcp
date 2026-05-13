import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import { GetAgentTriggersCatalogQuery, GetAgentSkillsCatalogQuery } from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('GetAgentCatalogTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockTrigger = {
    block_reference_id: 'status-change-ref',
    name: 'Status Change',
    description: 'Fires when a status column changes',
    field_schemas: [{ field_key: 'board_id', value_schema: 'The ID of the board to watch' }],
    required_fields: [{ field_key: 'board_id', depends_on: [], optional: false }],
  };

  const mockSkill = {
    id: 'skill-1',
    name: 'Board Manager',
    description: 'Manages boards and items',
  };

  it('should return triggers catalog when type is triggers', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.triggers[0].block_reference_id).toBe('status-change-ref');
  });

  it('should pass versionOverride dev when fetching triggers', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentTriggersCatalog'),
      expect.objectContaining({ block_reference_ids: undefined }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should pass block_reference_ids when provided', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [mockTrigger] } as GetAgentTriggersCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers', block_reference_ids: ['status-change-ref'] });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      { block_reference_ids: ['status-change-ref'] },
      expect.anything(),
    );
  });

  it('should return skills catalog when type is skills', async () => {
    mocks.setResponseOnce({ agent_skills_catalog: [mockSkill] } as GetAgentSkillsCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(1);
    expect(parsed.skills[0].id).toBe('skill-1');
  });

  it('should pass versionOverride dev when fetching skills', async () => {
    mocks.setResponseOnce({ agent_skills_catalog: [] } as GetAgentSkillsCatalogQuery);

    await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.stringContaining('getAgentSkillsCatalog'),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('should return empty list with count 0 when no triggers exist', async () => {
    mocks.setResponseOnce({ agent_triggers_catalog: [] } as GetAgentTriggersCatalogQuery);

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });
    const parsed = parseToolResult(result);

    expect(parsed.count).toBe(0);
    expect(parsed.triggers).toEqual([]);
  });

  it('should propagate errors when fetching triggers catalog', async () => {
    mocks.setError('Unauthorized');

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'triggers' });

    expect(result.content[0].text).toContain('Failed to fetch monday platform agent triggers catalog');
  });

  it('should propagate errors when fetching skills catalog', async () => {
    mocks.setError('Unauthorized');

    const result = await callToolByNameRawAsync('get_agent_catalog', { type: 'skills' });

    expect(result.content[0].text).toContain('Failed to fetch monday platform agent skills catalog');
  });
});
