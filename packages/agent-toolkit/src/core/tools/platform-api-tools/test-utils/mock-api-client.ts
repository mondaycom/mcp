export interface MockApiResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

/**
 * Creates a mock API client for testing
 * @returns An object with the mock API client and helper functions
 */
export function createMockApiClient() {
  const mockRequest = jest.fn();
  const mockApiClient = {
    request: mockRequest
  } as any;

  return {
    mockApiClient,
    mockRequest,

    setResponse: (data: any) => {
      mockRequest.mockResolvedValue(data);
    },

    setError: (messageOrError: string | Error, path: string[] = []) => {
      if (typeof messageOrError === 'string') {
        const error = new Error(messageOrError);
        (error as any).errors = [{ message: messageOrError, path }];
        mockRequest.mockRejectedValue(error);
      } else {
        mockRequest.mockRejectedValue(messageOrError);
      }
    },
 

    reset: () => {
      mockRequest.mockReset();
    },

    getMockRequest: () => mockRequest
  };
}

