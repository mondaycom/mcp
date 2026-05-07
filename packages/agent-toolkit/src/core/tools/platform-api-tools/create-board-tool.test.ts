import { createMockApiClient } from './test-utils/mock-api-client';
import { CreateBoardTool } from './create-board-tool';

describe('CreateBoardTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const successfulResponse = {
    create_board: {
      id: '123456',
      name: 'Test Board',
      url: 'https://monday.com/boards/123456',
    },
  };

  it('includes owners in variables when owners are provided', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateBoardTool(mocks.mockApiClient);

    await tool.execute({
      boardName: 'Test Board',
      boardKind: 'public',
      owners: ['111', '222'],
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createBoard'), {
      boardName: 'Test Board',
      boardKind: 'public',
      boardDescription: undefined,
      workspaceId: undefined,
      owners: ['111', '222'],
    });
  });

  it('does not include owners in variables when owners are not provided', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateBoardTool(mocks.mockApiClient);

    await tool.execute({
      boardName: 'Test Board',
      boardKind: 'public',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createBoard'), {
      boardName: 'Test Board',
      boardKind: 'public',
      boardDescription: undefined,
      workspaceId: undefined,
    });
  });
});
