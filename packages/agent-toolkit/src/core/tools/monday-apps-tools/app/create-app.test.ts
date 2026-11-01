import axios from 'axios';
import { CreateAppTool } from './create-app';

jest.mock('../../../../utils/tracking.utils', () => ({
  trackEvent: jest.fn(),
}));

describe('CreateAppTool', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks a failed API request as a tool error', async () => {
    const error = Object.assign(new Error('Request failed with status code 401'), {
      isAxiosError: true,
      response: { status: 401, data: { error: 'invalid token' } },
    });
    jest.spyOn(axios, 'request').mockRejectedValue(error);
    const tool = new CreateAppTool('invalid-token');

    const result = await tool.execute({ name: 'test-app' });

    expect(result).toMatchObject({
      content: 'Failed to create app: monday.com  API request failed with status 401: {"error":"invalid token"}',
      isError: true,
    });
  });

  it('leaves successful API requests marked as successful', async () => {
    jest.spyOn(axios, 'request').mockResolvedValue({
      data: {
        app: { id: 123, name: 'test-app' },
        app_version: { id: 456, name: 'Draft' },
      },
      status: 200,
      headers: {},
    } as never);
    const tool = new CreateAppTool('valid-token');

    const result = await tool.execute({ name: 'test-app' });

    expect(result.content).toBe('Created app "test-app" (ID: 123, Version: 456)');
    expect(result.isError).toBeUndefined();
  });
});
