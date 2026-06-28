import { AllApiWriteTool } from './all-api-write-tool';
import { createMockApiClient } from './test-utils/mock-api-client';

describe('AllApiWriteTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('throws when given a query', async () => {
    const tool = new AllApiWriteTool(mocks.mockApiClient);

    await expect(
      tool.execute({ query: 'query { boards { id } }', variables: '{}' }),
    ).rejects.toThrow('all_api_write only accepts mutations. Read queries are not allowed.');
  });

  it('does not throw when given a mutation', async () => {
    const tool = new AllApiWriteTool(mocks.mockApiClient);
    jest.spyOn(tool as any, 'validateOperation').mockResolvedValue([]);
    mocks.setResponse({ create_item: { id: '123' } });

    await expect(
      tool.execute({
        query: 'mutation { create_item(board_id: 1, item_name: "test") { id } }',
        variables: '{}',
      }),
    ).resolves.toBeDefined();
  });
});
