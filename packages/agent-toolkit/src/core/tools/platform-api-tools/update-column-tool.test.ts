import { createMockApiClient } from './test-utils/mock-api-client';
import { UpdateColumnTool } from './update-column-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';

describe('UpdateColumnTool rollupFunction', () => {
  const base = { boardId: 1, columnId: 'n', columnType: NonDeprecatedColumnType.Numbers, revision: 'r' };

  const run = async (extra: Record<string, unknown>) => {
    const mockApi = createMockApiClient();
    mockApi.setResponse({ update_column: { id: 'n', title: 't', revision: 'r2' } });
    await new UpdateColumnTool(mockApi.mockApiClient).execute({ ...base, ...extra } as never);
    return mockApi.mockRequest.mock.calls[0][1];
  };

  it('omits capabilities when rollupFunction is not provided', async () => {
    expect((await run({})).capabilities).toBeUndefined();
  });

  it('maps a function to calculated.function', async () => {
    expect((await run({ rollupFunction: 'SUM' })).capabilities).toEqual({ calculated: { function: 'SUM' } });
  });

  it('maps null to calculated: null', async () => {
    expect((await run({ rollupFunction: null })).capabilities).toEqual({ calculated: null });
  });
});
