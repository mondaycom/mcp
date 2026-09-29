import { createMockApiClient } from './test-utils/mock-api-client';
import { DeleteBoardTool } from './delete-board-tool';

describe('DeleteBoardTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  const successfulResponse = {
    delete_board: {
      id: '123456',
    },
  };

  it('deletes the board using the boardId from the input', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new DeleteBoardTool(mocks.mockApiClient);

    const result = await tool.execute({ boardId: 123456 });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation deleteBoard'), {
      boardId: '123456',
    });
    expect(result.content).toEqual({
      message: 'Board 123456 successfully deleted',
      board_id: '123456',
    });
  });

  it('uses the boardId from the context when provided', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new DeleteBoardTool(mocks.mockApiClient, { boardId: 123456 });

    await tool.execute({});

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation deleteBoard'), {
      boardId: '123456',
    });
  });
});
