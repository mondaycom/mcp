import { createMockApiClient } from './test-utils/mock-api-client';
import { CreateBoardTool } from './create-board-tool';
import { BoardKind } from '../../../monday-graphql/generated/graphql/graphql';

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

  it('includes boardOwnerIds in variables when provided', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateBoardTool(mocks.mockApiClient);

    await tool.execute({
      boardName: 'Test Board',
      boardKind: BoardKind.Public,
      boardOwnerIds: ['111', '222'],
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createBoard'), {
      boardName: 'Test Board',
      boardKind: BoardKind.Public,
      boardDescription: undefined,
      workspaceId: undefined,
      boardOwnerIds: ['111', '222'],
    });
  });

  it('does not include boardOwnerIds in variables when not provided', async () => {
    mocks.setResponse(successfulResponse);
    const tool = new CreateBoardTool(mocks.mockApiClient);

    await tool.execute({
      boardName: 'Test Board',
      boardKind: BoardKind.Public,
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('mutation createBoard'), {
      boardName: 'Test Board',
      boardKind: BoardKind.Public,
      boardDescription: undefined,
      workspaceId: undefined,
    });
  });
});
