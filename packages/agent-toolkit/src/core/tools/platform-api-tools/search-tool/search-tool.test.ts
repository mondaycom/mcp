import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { SearchTool, searchSchema, GlobalSearchType, ObjectPrefixes } from './search-tool';
import { z, ZodTypeAny } from 'zod';
import { GetBoardsQuery, GetDocsQuery, GetFoldersQuery } from 'src/monday-graphql';

export type inputType = z.objectInputType<typeof searchSchema, ZodTypeAny>;

describe('SearchTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient')
        .mockReturnValue(mocks.mockApiClient);
  });

  const mockBoardsResponse: GetBoardsQuery = {
    boards: [
      { id: '123', name: 'Test Board 1', url: 'https://monday.com/boards/123' },
      { id: '456', name: 'Test Board 2', url: 'https://monday.com/boards/456' },
      { id: '789', name: 'Another Board', url: 'https://monday.com/boards/789' }
    ]
  };

  const mockDocsResponse: GetDocsQuery = {
    docs: [
      { id: '111', name: 'Document 1', url: 'https://monday.com/docs/111' },
      { id: '222', name: 'Document 2', url: 'https://monday.com/docs/222' },
      { id: '333', name: 'Test Doc', url: 'https://monday.com/docs/333' }
    ]
  };

  const mockFoldersResponse: GetFoldersQuery = {
    folders: [
      { id: '100', name: 'Folder 1' },
      { id: '200', name: 'Folder 2' },
      { id: '300', name: 'Test Folder' }
    ]
  };

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      const tool = new SearchTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('search');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Search');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct description', () => {
      const tool = new SearchTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('Search within monday.com platform');
      expect(description).toContain('boards, documents, forms, folders');
      expect(description).toContain('IMPORTANT: ids returned by this tool are prefixed');
    });
  });

  describe('Schema Validation', () => {
    it('should reject missing searchType', async () => {
      const args: Partial<inputType> = {
        // searchType is missing
        searchTerm: 'test'
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(result.content[0].text).toContain('searchType');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should accept valid searchType', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toBeDefined();
      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });

    it('should validate limit does not exceed SEARCH_LIMIT (100)', async () => {
      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD,
        limit: 101 // exceeds max
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should accept limit at exactly SEARCH_LIMIT (100)', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        limit: 100
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });
  });

  describe('Board Search Handler', () => {
    describe('Success Cases', () => {
      it('should search boards with default parameters', async () => {
        mocks.setResponse(mockBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.results[0]).toEqual({
          id: 'board-123',
          title: 'Test Board 1',
          url: 'https://monday.com/boards/123'
        });
        expect(parsedResult.results[1]).toEqual({
          id: 'board-456',
          title: 'Test Board 2',
          url: 'https://monday.com/boards/456'
        });

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetBoards'),
          {
            page: 1,
            limit: 100,
            workspace_ids: undefined
          }
        );
      });

      it('should search boards with custom limit and page', async () => {
        mocks.setResponse(mockBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          limit: 50,
          page: 2
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetBoards'),
          {
            page: 2,
            limit: 50,
            workspace_ids: undefined
          }
        );
      });

      it('should search boards with workspace_ids filter', async () => {
        mocks.setResponse(mockBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          workspaceIds: [12345, 67890]
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetBoards'),
          {
            page: 1,
            limit: 100,
            workspace_ids: ['12345', '67890']
          }
        );
      });

      it('should search boards with searchTerm and use virtual pagination', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: [
            { id: '1', name: 'Test Board Alpha', url: 'https://monday.com/boards/1' },
            { id: '2', name: 'Another Board', url: 'https://monday.com/boards/2' },
            { id: '3', name: 'Test Board Beta', url: 'https://monday.com/boards/3' },
            { id: '4', name: 'Test Board Gamma', url: 'https://monday.com/boards/4' }
          ]
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test Board',
          limit: 2,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Should filter only boards containing "Test Board" and paginate
        expect(parsedResult.results).toHaveLength(2);
        expect(parsedResult.results[0].title).toContain('Test Board Alpha');
        expect(parsedResult.results[1].title).toContain('Test Board Beta');

        // When searchTerm is present, should request page 1 with high limit
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetBoards'),
          {
            page: 1,
            limit: 10000,
            workspace_ids: undefined
          }
        );
      });

      it('should handle empty boards response', async () => {
        const emptyResponse: GetBoardsQuery = {
          boards: []
        };

        mocks.setResponse(emptyResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should handle null boards response', async () => {
        const nullResponse: GetBoardsQuery = {
          boards: null as any
        };

        mocks.setResponse(nullResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should properly prefix board IDs', async () => {
        mocks.setResponse(mockBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results[0].id).toBe(`${ObjectPrefixes.BOARD}123`);
        expect(parsedResult.results[1].id).toBe(`${ObjectPrefixes.BOARD}456`);
        expect(parsedResult.results[2].id).toBe(`${ObjectPrefixes.BOARD}789`);
      });
    });

    describe('Virtual Pagination with Search Term', () => {
      it('should filter and paginate boards by search term - page 1', async () => {
        const manyBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 10 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(manyBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 3,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.results[0].title).toBe('Board 1');
        expect(parsedResult.results[1].title).toBe('Board 2');
        expect(parsedResult.results[2].title).toBe('Board 3');
      });

      it('should filter and paginate boards by search term - page 2', async () => {
        const manyBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 10 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(manyBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 3,
          page: 2
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.results[0].title).toBe('Board 4');
        expect(parsedResult.results[1].title).toBe('Board 5');
        expect(parsedResult.results[2].title).toBe('Board 6');
      });

      it('should handle case-insensitive search term filtering', async () => {
        const boardsResponse: GetBoardsQuery = {
          boards: [
            { id: '1', name: 'TEST Board', url: 'https://monday.com/boards/1' },
            { id: '2', name: 'test board', url: 'https://monday.com/boards/2' },
            { id: '3', name: 'TeSt BoArD', url: 'https://monday.com/boards/3' }
          ]
        };

        mocks.setResponse(boardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'test board'
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Should match all variations (case-insensitive)
        expect(parsedResult.results).toHaveLength(3);
      });

      it('should filter out non-matching boards with search term', async () => {
        // Need more items than limit to trigger virtual pagination filtering
        const boardsResponse: GetBoardsQuery = {
          boards: [
            { id: '1', name: 'Project Alpha', url: 'https://monday.com/boards/1' },
            { id: '2', name: 'Project Beta', url: 'https://monday.com/boards/2' },
            { id: '3', name: 'Task List', url: 'https://monday.com/boards/3' },
            { id: '4', name: 'Project Gamma', url: 'https://monday.com/boards/4' },
            { id: '5', name: 'Another Task', url: 'https://monday.com/boards/5' }
          ]
        };

        mocks.setResponse(boardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Project',
          limit: 2 // Limit must be less than total items for filtering to occur
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(2);
        expect(parsedResult.results[0].title).toBe('Project Alpha');
        expect(parsedResult.results[1].title).toBe('Project Beta');
      });
    });

    describe('Error Handling', () => {
      it('should handle GraphQL error for boards', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch boards';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle network error for boards', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Documents Search Handler', () => {
    describe('Success Cases', () => {
      it('should search documents with default parameters', async () => {
        mocks.setResponse(mockDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.results[0]).toEqual({
          id: 'doc-111',
          title: 'Document 1',
          url: 'https://monday.com/docs/111'
        });
        expect(parsedResult.results[1]).toEqual({
          id: 'doc-222',
          title: 'Document 2',
          url: 'https://monday.com/docs/222'
        });

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetDocs'),
          {
            page: 1,
            limit: 100,
            workspace_ids: undefined
          }
        );
      });

      it('should search documents with custom limit and page', async () => {
        mocks.setResponse(mockDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          limit: 25,
          page: 3
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetDocs'),
          {
            page: 3,
            limit: 25,
            workspace_ids: undefined
          }
        );
      });

      it('should search documents with workspace_ids filter', async () => {
        mocks.setResponse(mockDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          workspaceIds: [11111, 22222]
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetDocs'),
          {
            page: 1,
            limit: 100,
            workspace_ids: ['11111', '22222']
          }
        );
      });

      it('should search documents with searchTerm and use virtual pagination', async () => {
        const largeDocsResponse: GetDocsQuery = {
          docs: [
            { id: '1', name: 'Test Document Alpha', url: 'https://monday.com/docs/1' },
            { id: '2', name: 'Another Doc', url: 'https://monday.com/docs/2' },
            { id: '3', name: 'Test Document Beta', url: 'https://monday.com/docs/3' },
            { id: '4', name: 'Test Document Gamma', url: 'https://monday.com/docs/4' }
          ]
        };

        mocks.setResponse(largeDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Test Document',
          limit: 2,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(2);
        expect(parsedResult.results[0].title).toContain('Test Document Alpha');
        expect(parsedResult.results[1].title).toContain('Test Document Beta');

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetDocs'),
          {
            page: 1,
            limit: 10000,
            workspace_ids: undefined
          }
        );
      });

      it('should handle empty documents response', async () => {
        const emptyResponse: GetDocsQuery = {
          docs: []
        };

        mocks.setResponse(emptyResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should handle null documents response', async () => {
        const nullResponse: GetDocsQuery = {
          docs: null as any
        };

        mocks.setResponse(nullResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should properly prefix document IDs', async () => {
        mocks.setResponse(mockDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results[0].id).toBe(`${ObjectPrefixes.DOCUMENT}111`);
        expect(parsedResult.results[1].id).toBe(`${ObjectPrefixes.DOCUMENT}222`);
        expect(parsedResult.results[2].id).toBe(`${ObjectPrefixes.DOCUMENT}333`);
      });

      it('should handle documents with null url', async () => {
        const docsWithNullUrl: GetDocsQuery = {
          docs: [
            { id: '111', name: 'Document 1', url: null },
            { id: '222', name: 'Document 2', url: undefined }
          ]
        };

        mocks.setResponse(docsWithNullUrl);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results[0].url).toBeUndefined();
        expect(parsedResult.results[1].url).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle GraphQL error for documents', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch documents';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Folders Search Handler', () => {
    describe('Success Cases', () => {
      it('should search folders with default parameters', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.results[0]).toEqual({
          id: 'folder-100',
          title: 'Folder 1'
        });
        expect(parsedResult.results[1]).toEqual({
          id: 'folder-200',
          title: 'Folder 2'
        });

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetFolders'),
          {
            page: 1,
            limit: 100,
            workspace_ids: undefined
          }
        );
      });

      it('should search folders with custom limit and page', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          limit: 10,
          page: 5
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetFolders'),
          {
            page: 5,
            limit: 10,
            workspace_ids: undefined
          }
        );
      });

      it('should search folders with workspace_ids filter', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          workspaceIds: [99999]
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toBeDefined();
        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetFolders'),
          {
            page: 1,
            limit: 100,
            workspace_ids: ['99999']
          }
        );
      });

      it('should search folders with searchTerm and use virtual pagination', async () => {
        const largeFoldersResponse: GetFoldersQuery = {
          folders: [
            { id: '1', name: 'Test Folder Alpha' },
            { id: '2', name: 'Another Folder' },
            { id: '3', name: 'Test Folder Beta' },
            { id: '4', name: 'Test Folder Gamma' }
          ]
        };

        mocks.setResponse(largeFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test Folder',
          limit: 2,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(2);
        expect(parsedResult.results[0].title).toContain('Test Folder Alpha');
        expect(parsedResult.results[1].title).toContain('Test Folder Beta');

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetFolders'),
          {
            page: 1,
            limit: 10000,
            workspace_ids: undefined
          }
        );
      });

      it('should handle empty folders response', async () => {
        const emptyResponse: GetFoldersQuery = {
          folders: []
        };

        mocks.setResponse(emptyResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should handle null folders response', async () => {
        const nullResponse: GetFoldersQuery = {
          folders: null as any
        };

        mocks.setResponse(nullResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
      });

      it('should properly prefix folder IDs', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results[0].id).toBe(`${ObjectPrefixes.FOLDER}100`);
        expect(parsedResult.results[1].id).toBe(`${ObjectPrefixes.FOLDER}200`);
        expect(parsedResult.results[2].id).toBe(`${ObjectPrefixes.FOLDER}300`);
      });

      it('should not include url field for folders', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results[0].url).toBeUndefined();
        expect(parsedResult.results[1].url).toBeUndefined();
        expect(parsedResult.results[2].url).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle GraphQL error for folders', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch folders';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Unsupported Search Type', () => {
    it('should throw error for unsupported search type', async () => {
      const args: Omit<inputType, 'searchType'> & { searchType: string } = {
        searchType: 'UNSUPPORTED_TYPE'
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('getPagingParamsForSearch', () => {
    it('should return high limit and page 1 when searchTerm is provided', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'test',
        limit: 50,
        page: 3
      };

      await callToolByNameAsync('search', args);

      // When searchTerm is present, should override to page 1 and limit 10000
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        {
          page: 1,
          limit: 10000,
          workspace_ids: undefined
        }
      );
    });

    it('should return original limit and page when searchTerm is not provided', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        limit: 50,
        page: 3
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        {
          page: 3,
          limit: 50,
          workspace_ids: undefined
        }
      );
    });

    it('should return original limit and page when searchTerm is empty string', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: '',
        limit: 50,
        page: 3
      };

      await callToolByNameAsync('search', args);

      // Empty string is falsy, so should use original page and limit
      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        {
          page: 3,
          limit: 50,
          workspace_ids: undefined
        }
      );
    });
  });

  describe('searchAndVirtuallyPaginate', () => {
    it('should return all items when count is less than or equal to limit', async () => {
      const smallResponse: GetBoardsQuery = {
        boards: [
          { id: '1', name: 'Board 1', url: 'https://monday.com/boards/1' },
          { id: '2', name: 'Board 2', url: 'https://monday.com/boards/2' }
        ]
      };

      mocks.setResponse(smallResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 10 // limit is higher than result count
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(2);
    });

    it('should slice results correctly for page 1', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Board ${i + 1}`,
          url: `https://monday.com/boards/${i + 1}`
        }))
      };

      mocks.setResponse(largeResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 5,
        page: 1
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(5);
      expect(parsedResult.results[0].title).toBe('Board 1');
      expect(parsedResult.results[4].title).toBe('Board 5');
    });

    it('should slice results correctly for page 2', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Board ${i + 1}`,
          url: `https://monday.com/boards/${i + 1}`
        }))
      };

      mocks.setResponse(largeResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 5,
        page: 2
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(5);
      expect(parsedResult.results[0].title).toBe('Board 6');
      expect(parsedResult.results[4].title).toBe('Board 10');
    });

    it('should slice results correctly for last partial page', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 12 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Board ${i + 1}`,
          url: `https://monday.com/boards/${i + 1}`
        }))
      };

      mocks.setResponse(largeResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 5,
        page: 3
      };

      const parsedResult = await callToolByNameAsync('search', args);

      // Only 2 items should remain on page 3
      expect(parsedResult.results).toHaveLength(2);
      expect(parsedResult.results[0].title).toBe('Board 11');
      expect(parsedResult.results[1].title).toBe('Board 12');
    });

    it('should return empty array when page exceeds available results', async () => {
      // Need more items than limit to trigger pagination
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 15 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Board ${i + 1}`,
          url: `https://monday.com/boards/${i + 1}`
        }))
      };

      mocks.setResponse(largeResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 5,
        page: 10 // way beyond available data
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(0);
    });

    it('should handle special characters in search term', async () => {
      const boardsResponse: GetBoardsQuery = {
        boards: [
          { id: '1', name: 'Board (Test)', url: 'https://monday.com/boards/1' },
          { id: '2', name: 'Board [Draft]', url: 'https://monday.com/boards/2' },
          { id: '3', name: 'Board-Final', url: 'https://monday.com/boards/3' }
        ]
      };

      mocks.setResponse(boardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board'
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(3);
    });

    it('should handle empty search term as no filter', async () => {
      const boardsResponse: GetBoardsQuery = {
        boards: [
          { id: '1', name: 'Alpha', url: 'https://monday.com/boards/1' },
          { id: '2', name: 'Beta', url: 'https://monday.com/boards/2' },
          { id: '3', name: 'Gamma', url: 'https://monday.com/boards/3' }
        ]
      };

      mocks.setResponse(boardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: '',
        limit: 2,
        page: 1
      };

      const parsedResult = await callToolByNameAsync('search', args);

      // Empty string is falsy, so no virtual pagination - should return first 2
      expect(parsedResult.results).toHaveLength(2);
    });
  });

  describe('Default Values', () => {
    it('should use default limit of 100 when not specified', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        expect.objectContaining({
          limit: 100
        })
      );
    });

    it('should use default page of 1 when not specified', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        expect.objectContaining({
          page: 1
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle boards with null name fields gracefully', async () => {
      const boardsWithNullNames: GetBoardsQuery = {
        boards: [
          { id: '1', name: null as any, url: 'https://monday.com/boards/1' }
        ]
      };

      mocks.setResponse(boardsWithNullNames);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(1);
      expect(parsedResult.results[0].title).toBeNull();
    });

    it('should handle documents with null name fields gracefully', async () => {
      const docsWithNullNames: GetDocsQuery = {
        docs: [
          { id: '1', name: null as any, url: 'https://monday.com/docs/1' }
        ]
      };

      mocks.setResponse(docsWithNullNames);

      const args: inputType = {
        searchType: GlobalSearchType.DOCUMENTS
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(1);
      expect(parsedResult.results[0].title).toBeNull();
    });

    it('should handle folders with null name fields gracefully', async () => {
      const foldersWithNullNames: GetFoldersQuery = {
        folders: [
          { id: '1', name: null as any }
        ]
      };

      mocks.setResponse(foldersWithNullNames);

      const args: inputType = {
        searchType: GlobalSearchType.FOLDERS
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(1);
      expect(parsedResult.results[0].title).toBeNull();
    });

    it('should handle multiple workspace IDs', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        workspaceIds: [1, 2, 3, 4, 5]
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetBoards'),
        expect.objectContaining({
          workspace_ids: ['1', '2', '3', '4', '5']
        })
      );
    });

    it('should handle limit of 1', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        limit: 1
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(1);
    });

    it('should handle very high page number with no results', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 2,
        page: 1000
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(0);
    });
  });
});

