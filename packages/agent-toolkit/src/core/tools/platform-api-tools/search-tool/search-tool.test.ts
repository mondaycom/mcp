import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { z, ZodTypeAny } from 'zod';
import {
  GlobalSearchType,
  ObjectPrefixes,
  SearchTool,
  SearchToolInput,
} from './search-tool';
import { getBoards, getDocs, getFolders } from './search-tool.graphql';

jest.mock('src/utils/tracking.utils', () => ({
  trackEvent: jest.fn(),
}));

export type InputType = z.objectInputType<SearchToolInput, ZodTypeAny>;

describe('SearchTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest
      .spyOn(MondayAgentToolkit.prototype as any, 'createApiClient')
      .mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should search boards with default pagination values', async () => {
    const boardsResponse = {
      boards: [
        { id: '101', name: 'Roadmap', url: 'https://monday.com/boards/101' },
        { id: '102', name: 'Backlog', url: 'https://monday.com/boards/102' },
      ],
    };

    mocks.setResponse(boardsResponse);

    const args: InputType = {
      searchType: GlobalSearchType.BOARD,
    };

    const parsedResult = await callToolByNameAsync('search', args);

    expect(parsedResult.results).toEqual([
      {
        id: `${ObjectPrefixes.BOARD}101`,
        title: 'Roadmap',
        url: 'https://monday.com/boards/101',
      },
      {
        id: `${ObjectPrefixes.BOARD}102`,
        title: 'Backlog',
        url: 'https://monday.com/boards/102',
      },
    ]);

    const mockCall = mocks.getMockRequest().mock.calls[0];
    expect(mockCall[0]).toBe(getBoards);
    expect(mockCall[1]).toEqual({
      page: 1,
      limit: 100,
      workspace_ids: undefined,
    });

    const rawResult = await callToolByNameRawAsync('search', args);
    expect(rawResult.content[0].text).toBe(
      JSON.stringify(
        {
          results: [
            {
              id: `${ObjectPrefixes.BOARD}101`,
              title: 'Roadmap',
              url: 'https://monday.com/boards/101',
            },
            {
              id: `${ObjectPrefixes.BOARD}102`,
              title: 'Backlog',
              url: 'https://monday.com/boards/102',
            },
          ],
        },
        null,
        2,
      ),
    );
  });

  it('should fetch documents using virtual pagination when search term provided', async () => {
    const docsResponse = {
      docs: [
        { id: '201', name: 'Alpha Project Plan', url: 'https://monday.com/docs/201' },
        { id: '202', name: 'Project Charter', url: 'https://monday.com/docs/202' },
        { id: '203', name: 'Meeting Notes', url: 'https://monday.com/docs/203' },
      ],
    };

    mocks.setResponse(docsResponse);

    const args: InputType = {
      searchType: GlobalSearchType.DOCUMENTS,
      searchTerm: 'project',
      limit: 1,
      page: 2,
      workspaceIds: [555, 777],
    };

    const parsedResult = await callToolByNameAsync('search', args);

    expect(parsedResult.results).toEqual([
      {
        id: `${ObjectPrefixes.DOCUMENT}202`,
        title: 'Project Charter',
        url: 'https://monday.com/docs/202',
      },
    ]);

    const mockCall = mocks.getMockRequest().mock.calls[0];
    expect(mockCall[0]).toBe(getDocs);
    expect(mockCall[1]).toEqual({
      page: 1,
      limit: 10_000,
      workspace_ids: ['555', '777'],
    });
  });

  it('should search folders with workspace filters and return prefixed ids', async () => {
    const foldersResponse = {
      folders: [
        { id: '301', name: 'Finance Department' },
        { id: '302', name: 'Product Launch' },
        { id: '303', name: 'HR Onboarding' },
      ],
    };

    mocks.setResponse(foldersResponse);

    const args: InputType = {
      searchType: GlobalSearchType.FOLDERS,
      searchTerm: 'product',
      limit: 2,
      page: 1,
      workspaceIds: [999],
    };

    const parsedResult = await callToolByNameAsync('search', args);

    expect(parsedResult.results).toEqual([
      {
        id: `${ObjectPrefixes.FOLDER}302`,
        title: 'Product Launch',
      },
    ]);

    const mockCall = mocks.getMockRequest().mock.calls[0];
    expect(mockCall[0]).toBe(getFolders);
    expect(mockCall[1]).toEqual({
      page: 1,
      limit: 10_000,
      workspace_ids: ['999'],
    });
  });

  it('should return empty results when search term matches nothing', async () => {
    const docsResponse = {
      docs: [
        { id: '401', name: 'Release Checklist', url: 'https://monday.com/docs/401' },
        { id: '402', name: 'Support Playbook', url: 'https://monday.com/docs/402' },
      ],
    };

    mocks.setResponse(docsResponse);

    const args: InputType = {
      searchType: GlobalSearchType.DOCUMENTS,
      searchTerm: 'marketing roadmap',
      limit: 1,
      page: 1,
    };

    const parsedResult = await callToolByNameAsync('search', args);

    expect(parsedResult.results).toEqual([]);

    const mockCall = mocks.getMockRequest().mock.calls[0];
    expect(mockCall[0]).toBe(getDocs);
    expect(mockCall[1]).toEqual({
      page: 1,
      limit: 10_000,
      workspace_ids: undefined,
    });
  });

  it('should throw an error for unsupported search types', async () => {
    const searchTool = new SearchTool(mocks.mockApiClient as any, 'test-token');

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (searchTool as any).executeInternal({ searchType: 'INVALID_TYPE' })
    ).rejects.toThrow('Unsupported search type: INVALID_TYPE');
  });
});

