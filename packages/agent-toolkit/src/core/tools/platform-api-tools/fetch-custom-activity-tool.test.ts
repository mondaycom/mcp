import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from './test-utils/mock-api-client';

describe('FetchCustomActivityTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns formatted custom activities', async () => {
    mocks.setResponse({
      custom_activity: [
        {
          id: 'activity_1',
          name: 'Deal won',
          color: 'green',
          icon_id: 'icon_1',
          type: 'crm',
        },
      ],
    });

    const result = await callToolByNameRawAsync('fetch_custom_activity', {});

    expect(result.content[0].text).toContain('Found 1 custom activities');
    expect(result.content[0].text).toContain('Deal won');
  });

  it('returns no custom activities when all entries are null', async () => {
    mocks.setResponse({ custom_activity: [null] });

    const result = await callToolByNameRawAsync('fetch_custom_activity', {});

    expect(result.content[0].text).toBe('No custom activities found');
  });
});
