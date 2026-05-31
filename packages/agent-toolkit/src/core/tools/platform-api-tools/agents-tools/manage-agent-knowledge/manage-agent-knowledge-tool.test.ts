import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../../test-utils/mock-api-client';
import {
  GetAgentKnowledgeQuery,
  AddAgentResourceAccessMutation,
  RemoveAgentResourceAccessMutation,
  UpdateAgentResourceAccessMutation,
} from 'src/monday-graphql/generated/graphql.dev/graphql';

describe('ManageAgentKnowledgeTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockKnowledge = {
    resources: [{ resource_id: '42', scope_type: 'BOARD', permission_type: 'READ' }],
    files: [],
  };

  // 1. Happy path list
  it('should list agent knowledge resources', async () => {
    mocks.setResponseOnce({ agent_knowledge: mockKnowledge } as GetAgentKnowledgeQuery);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', { action: 'list', agent_id: '7' });
    const parsed = parseToolResult(result);

    expect(parsed.knowledge.resources[0].resource_id).toBe('42');
  });

  // 2. Happy path add
  it('should add resource access to agent', async () => {
    mocks.setResponseOnce({ add_agent_resource_access: { success: true } } as AddAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  // 3. Happy path update
  it('should update resource access permission', async () => {
    mocks.setResponseOnce({ update_agent_resource_access: { success: true } } as UpdateAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'update',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ_WRITE',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  // 4. Happy path remove
  it('should remove resource access from agent', async () => {
    mocks.setResponseOnce({ remove_agent_resource_access: { success: true } } as RemoveAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'remove',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
    });
    const parsed = parseToolResult(result);

    expect(parsed.success).toBe(true);
  });

  // 5. list passes versionOverride dev
  it('should pass versionOverride:dev when listing', async () => {
    mocks.setResponseOnce({ agent_knowledge: mockKnowledge } as GetAgentKnowledgeQuery);

    await callToolByNameRawAsync('manage_agent_knowledge', { action: 'list', agent_id: '7' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  // 6. add maps agent_id to id
  it('should map agent_id to id in add variables', async () => {
    mocks.setResponseOnce({ add_agent_resource_access: { success: true } } as AddAgentResourceAccessMutation);

    await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: '7', resource_id: '42', scope_type: 'BOARD', permission_type: 'READ' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  // 7. Validation error — add missing resource_id
  it('should reject add action without resource_id', async () => {
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(result.content[0].text).toContain('resource_id, scope_type, and permission_type are required');
  });

  // 8. Validation error — remove missing scope_type
  it('should reject remove action without scope_type', async () => {
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'remove',
      agent_id: '7',
      resource_id: '42',
    });

    expect(result.content[0].text).toContain('resource_id and scope_type are required');
  });

  // 9. API error propagation — list
  it('should propagate errors with context for list', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_knowledge', { action: 'list', agent_id: '7' });

    expect(result.content[0].text).toContain('Failed to list agent knowledge');
  });

  // 10. API error propagation — add
  it('should propagate errors with context for add', async () => {
    mocks.setError('API error');

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(result.content[0].text).toContain('Failed to add agent resource access');
  });

  // 11. success:false fallback — add
  it('should return success:false when add_agent_resource_access is null', async () => {
    mocks.setResponseOnce({ add_agent_resource_access: null } as AddAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'add',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ',
    });

    expect(parseToolResult(result).success).toBe(false);
  });

  // 12. success:false fallback — remove
  it('should return success:false when remove_agent_resource_access is null', async () => {
    mocks.setResponseOnce({ remove_agent_resource_access: null } as RemoveAgentResourceAccessMutation);

    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'remove',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
    });

    expect(parseToolResult(result).success).toBe(false);
  });

  it('should reject update action with missing permission_type', async () => {
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'update',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      // permission_type omitted
    });
    expect(result.content[0].text).toContain('resource_id, scope_type, and permission_type are required for action:update');
  });

  it('should return success:false when update_agent_resource_access is null', async () => {
    mocks.setResponseOnce({ update_agent_resource_access: null } as UpdateAgentResourceAccessMutation);
    const result = await callToolByNameRawAsync('manage_agent_knowledge', {
      action: 'update',
      agent_id: '7',
      resource_id: '42',
      scope_type: 'BOARD',
      permission_type: 'READ_WRITE',
    });
    expect(parseToolResult(result).success).toBe(false);
  });
});
