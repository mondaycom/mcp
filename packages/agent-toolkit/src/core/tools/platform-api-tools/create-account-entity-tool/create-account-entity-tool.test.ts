import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateAccountEntityTool } from './create-account-entity-tool';

describe('CreateAccountEntityTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('successfully creates an account entity', async () => {
    mocks.setResponse({
      create_account_entity: { id: '42', name: 'my_entity', description: 'A test entity', parent_id: null },
    });
    const tool = new CreateAccountEntityTool(mocks.mockApiClient);

    const result = await tool.execute({ name: 'my_entity', description: 'A test entity' });

    expect(result.content).toEqual({
      message: 'Account entity "my_entity" successfully created',
      entity_id: '42',
      entity_name: 'my_entity',
    });
  });

  it('passes versionOverride dev to API request', async () => {
    mocks.setResponse({
      create_account_entity: { id: '1', name: 'test', description: null, parent_id: null },
    });
    const tool = new CreateAccountEntityTool(mocks.mockApiClient);

    await tool.execute({ name: 'test' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'test' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('passes optional parentId and description', async () => {
    mocks.setResponse({
      create_account_entity: { id: '5', name: 'child', description: 'desc', parent_id: '3' },
    });
    const tool = new CreateAccountEntityTool(mocks.mockApiClient);

    await tool.execute({ name: 'child', parentId: '3', description: 'desc' });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'child', parentId: '3', description: 'desc' }),
      expect.objectContaining({ versionOverride: 'dev' }),
    );
  });

  it('propagates API errors', async () => {
    mocks.getMockRequest().mockRejectedValueOnce(new Error('Unauthorized'));
    const tool = new CreateAccountEntityTool(mocks.mockApiClient);

    await expect(tool.execute({ name: 'test' })).rejects.toThrow('Unauthorized');
  });

  it('has correct tool properties', () => {
    const tool = new CreateAccountEntityTool(mocks.mockApiClient);

    expect(tool.name).toBe('create_account_entity');
    expect(tool.type).toBe('write');
    expect(tool.getDescription()).toContain('account-level entity');
  });
});
