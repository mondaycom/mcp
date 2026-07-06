import { parse } from 'graphql';
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
      graphql_queries: { boards: 1 },
      graphql_mutations: { create_item: 1 },
    });
  });

  it('counts create_item twice for aliased fields in a named mutation', async () => {
    const mockRequest = jest.fn().mockResolvedValue({
      item1: { id: '1', name: 'Test item 1 from all_monday_api', url: 'https://example.com/1' },
      item2: { id: '2', name: 'Test item 2 from all_monday_api', url: 'https://example.com/2' },
    });
    const tool = new AllMondayApiTool({ request: mockRequest } as unknown as ApiClient);
    jest.spyOn(tool as unknown as { validateOperation: () => Promise<string[]> }, 'validateOperation').mockResolvedValue([]);

    const input = {
      query: `mutation CreateTwoItems($boardId: ID!) {
  item1: create_item(board_id: $boardId, item_name: "Test item 1 from all_monday_api") {
    id
    name
    url
  }
  item2: create_item(board_id: $boardId, item_name: "Test item 2 from all_monday_api") {
    id
    name
    url
  }
}`,
      variables: '{"boardId":"143193795"}',
    };

    const sessionContext = { metadata: {} as Record<string, unknown> };

    await tool.execute(input, sessionContext);

    expect(sessionContext.metadata).toEqual({
      graphql_queries: {},
      graphql_mutations: { create_item: 2 },
    });
    expect(sessionContext.metadata.graphql_mutations).not.toHaveProperty('CreateTwoItems');
  });

  it('counts duplicate operations in a single call', async () => {
    const mockRequest = jest.fn().mockResolvedValue({ create_item: { id: '1' } });
    const tool = new AllMondayApiTool({ request: mockRequest } as unknown as ApiClient);
    jest.spyOn(tool as unknown as { validateOperation: () => Promise<string[]> }, 'validateOperation').mockResolvedValue([]);

    const query = `
      mutation CreateItem($boardId: ID!, $itemName: String!) {
        create_item(board_id: $boardId, item_name: $itemName) { id }
      }
      mutation CreateItem($boardId: ID!, $itemName: String!) {
        create_item(board_id: $boardId, item_name: $itemName) { id }
      }
    `;

    const counts = (
      tool as unknown as {
        countGraphqlOperations: (doc: ReturnType<typeof parse>) => {
          graphql_queries: Record<string, number>;
          graphql_mutations: Record<string, number>;
        };
      }
    ).countGraphqlOperations(parse(query));

    const sessionContext = { metadata: {} as Record<string, unknown> };

    await tool.execute({ query, variables: '{}' }, sessionContext);

    expect(counts).toEqual({
      graphql_queries: {},
      graphql_mutations: { create_item: 2 },
    });
    expect(sessionContext.metadata).toEqual({
      graphql_queries: {},
      graphql_mutations: { create_item: 2 },
    });
  });

  it('uses root field name for anonymous operations', async () => {
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
