import { AllMondayApiTool } from './all-monday-api-tool';
import type { ApiClient } from '@mondaydotcomorg/api';

describe('AllMondayApiTool', () => {
  const mockMondayApi = {} as ApiClient;

  it('throws on invalid variables JSON', async () => {
    const tool = new AllMondayApiTool(mockMondayApi);

    await expect(
      tool.execute({ query: 'query { boards { id } }', variables: 'not-json' })
    ).rejects.toThrow('Error parsing variables');
  });

  it('throws on GraphQL schema validation errors', async () => {
    const tool = new AllMondayApiTool(mockMondayApi);
    jest.spyOn(tool as unknown as { validateOperation: () => Promise<string[]> }, 'validateOperation').mockResolvedValue([
      'Cannot query field "thisFieldDoesNotExist" on type "Query".',
    ]);

    const sessionContext = { metadata: {} as Record<string, unknown> };

    await expect(
      tool.execute({ query: 'query { thisFieldDoesNotExist }', variables: '{}' }, sessionContext)
    ).rejects.toThrow('Cannot query field "thisFieldDoesNotExist" on type "Query".');

    expect(sessionContext.metadata).toEqual({
      graphql_queries: { thisFieldDoesNotExist: 1 },
      graphql_mutations: {},
    });
  });

  it('records graphql operation counts on sessionContext metadata', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ boards: [{ id: '1' }] });
    const tool = new AllMondayApiTool({ request: mockRequest } as unknown as ApiClient);
    jest.spyOn(tool as unknown as { validateOperation: () => Promise<string[]> }, 'validateOperation').mockResolvedValue([]);

    const sessionContext = { metadata: {} as Record<string, unknown> };

    await tool.execute(
      {
        query: `
          query GetBoards { boards { id } }
          mutation CreateItem($boardId: ID!, $itemName: String!) {
            create_item(board_id: $boardId, item_name: $itemName) { id }
          }
        `,
        variables: '{}',
      },
      sessionContext,
    );

    expect(sessionContext.metadata).toEqual({
      graphql_queries: { GetBoards: 1 },
      graphql_mutations: { CreateItem: 1 },
    });
  });

  it('uses root field name when operation is anonymous', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ boards: [{ id: '1' }] });
    const tool = new AllMondayApiTool({ request: mockRequest } as unknown as ApiClient);
    jest.spyOn(tool as unknown as { validateOperation: () => Promise<string[]> }, 'validateOperation').mockResolvedValue([]);

    const sessionContext = { metadata: {} as Record<string, unknown> };

    await tool.execute({ query: 'query { boards { id } }', variables: '{}' }, sessionContext);

    expect(sessionContext.metadata).toEqual({
      graphql_queries: { boards: 1 },
      graphql_mutations: {},
    });
  });
});
