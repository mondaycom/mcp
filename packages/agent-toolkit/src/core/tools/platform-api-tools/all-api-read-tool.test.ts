import { AllApiReadTool } from './all-api-read-tool';
import { createMockApiClient } from './test-utils/mock-api-client';

describe('AllApiReadTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('throws when given a mutation', async () => {
    const tool = new AllApiReadTool(mocks.mockApiClient);

    await expect(
      tool.execute({ query: 'mutation { create_item(board_id: 1, item_name: "test") { id } }', variables: '{}' }),
    ).rejects.toThrow('all_api_read only accepts read queries');
  });

  it('does not throw when given a query', async () => {
    const tool = new AllApiReadTool(mocks.mockApiClient);
    jest.spyOn(tool as any, 'validateOperation').mockResolvedValue([]);
    mocks.setResponse({ boards: [{ id: '1' }] });

    await expect(tool.execute({ query: 'query { boards { id } }', variables: '{}' })).resolves.toBeDefined();
  });
});
