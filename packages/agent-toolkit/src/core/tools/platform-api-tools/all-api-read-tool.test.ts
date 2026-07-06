import { AllApiReadTool } from './all-api-read-tool';
import { createMockApiClient } from './test-utils/mock-api-client';

describe('AllApiReadTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('throws when given a mutation', async () => {
    const tool = new AllApiReadTool(mocks.mockApiClient);
    const sessionContext = { metadata: {} as Record<string, unknown> };

    await expect(
      tool.execute(
        { query: 'mutation { create_item(board_id: 1, item_name: "test") { id } }', variables: '{}' },
        sessionContext,
      ),
    ).rejects.toThrow('all_api_read only accepts read queries. Mutations are not allowed.');

    expect(sessionContext.metadata).toEqual({
      graphql_queries: {},
      graphql_mutations: { create_item: 1 },
    });
  });

  it('does not throw when given a query', async () => {
    const tool = new AllApiReadTool(mocks.mockApiClient);
    jest.spyOn(tool as any, 'validateOperation').mockResolvedValue([]);
    mocks.setResponse({ boards: [{ id: '1' }] });

    await expect(tool.execute({ query: 'query { boards { id } }', variables: '{}' })).resolves.toBeDefined();
  });
});
