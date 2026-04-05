import { ApiClient } from '@mondaydotcomorg/api';
import { MondayAgentToolkit } from './toolkit';
import { ToolType } from '../core/tool';
import { getFilteredToolInstances } from '../utils/tools/tools-filtering.utils';
import { API_VERSION } from 'src/utils';

jest.mock('@mondaydotcomorg/api', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../utils/tools/tools-filtering.utils', () => ({
  getFilteredToolInstances: jest.fn(),
}));

const mockGetFilteredToolInstances = getFilteredToolInstances as jest.MockedFunction<
  typeof getFilteredToolInstances
>;
const mockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('OpenAI MondayAgentToolkit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFilteredToolInstances.mockReturnValue([]);
  });

  it('should initialize the monday API client with default API version', () => {
    new MondayAgentToolkit({
      mondayApiToken: 'test-token',
    });

    expect(mockApiClient).toHaveBeenCalledWith({
      token: 'test-token',
      apiVersion: API_VERSION,
      endpoint: undefined,
      requestConfig: undefined,
    });
  });

  it('should sanitize unsafe characters in OpenAI tool descriptions', () => {
    const mockTool = {
      name: 'unsafe-description-tool',
      type: ToolType.READ,
      annotations: { audience: [] },
      enabledByDefault: true,
      getDescription: jest.fn().mockReturnValue('Use `position`; then call `refresh`.'),
      getInputSchema: jest.fn().mockReturnValue({}),
      execute: jest.fn().mockResolvedValue({ content: 'OK' }),
    };

    mockGetFilteredToolInstances.mockReturnValue([mockTool]);

    const toolkit = new MondayAgentToolkit({
      mondayApiToken: 'test-token',
    });

    const tools = toolkit.getTools();

    expect(tools[0]?.function.description).toBe("Use 'position', then call 'refresh'.");
  });
});
