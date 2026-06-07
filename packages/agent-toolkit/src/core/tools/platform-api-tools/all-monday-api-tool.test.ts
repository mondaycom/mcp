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

    await expect(
      tool.execute({ query: 'query { thisFieldDoesNotExist }', variables: '{}' })
    ).rejects.toThrow('Cannot query field "thisFieldDoesNotExist" on type "Query".');
  });
});
