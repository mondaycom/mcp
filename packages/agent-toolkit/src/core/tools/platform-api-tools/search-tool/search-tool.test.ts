import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { SearchTool, searchSchema } from './search-tool';
import { z, ZodTypeAny } from 'zod';
import {
  GetFoldersQuery,
  SearchBoardsQuery,
  SearchDocsQuery,
  SearchItemsQuery,
  SearchWorkspacesQuery,
  SearchUpdatesQuery,
  SearchTimelineItemsQuery,
} from 'src/monday-graphql/generated/graphql/graphql';
import { GlobalSearchType, SearchResult } from './search-tool.types';

export type inputType = z.objectInputType<typeof searchSchema, ZodTypeAny>;

describe('SearchTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockDevBoardsResponse: SearchBoardsQuery = {
    search: {
      boards: {
        results: [
          { id: '123', indexed_data: { id: '123', name: 'Test Board 1', url: 'https://monday.com/boards/123' } },
          { id: '456', indexed_data: { id: '456', name: 'Test Board 2', url: 'https://monday.com/boards/456' } },
          { id: '789', indexed_data: { id: '789', name: 'Another Board', url: 'https://monday.com/boards/789' } },
        ],
      },
    },
  };

  const mockDevDocsResponse: SearchDocsQuery = {
    search: {
      docs: {
        results: [
          { id: '111', indexed_data: { id: '111', name: 'Document 1' } },
          { id: '222', indexed_data: { id: '222', name: 'Document 2' } },
          { id: '333', indexed_data: { id: '333', name: 'Test Doc' } },
        ],
      },
    },
  };

  const mockFoldersResponse: GetFoldersQuery = {
    folders: [
      { id: '100', name: 'Folder 1' },
      { id: '200', name: 'Folder 2' },
      { id: '300', name: 'Test Folder' },
    ],
  };

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      const tool = new SearchTool(mocks.mockApiClient);

      expect(tool.name).toBe('search');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Search');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct description', () => {
      const tool = new SearchTool(mocks.mockApiClient);
      const description = tool.getDescription();

      expect(description).toContain('Search within monday.com platform');
      expect(description).toContain(
        'Supported searchType values: BOARD, DOCUMENTS, FOLDERS, WORKSPACES, UPDATES, ITEMS, TIMELINE_ITEMS',
      );
      expect(description).toContain('FOLDERS search requires workspaceIds');
      expect(description).toContain('TIMELINE_ITEMS search returns id, title, summary, and content');
      expect(description).not.toContain('IMPORTANT: ids returned by this tool are prefixed');
    });
  });

  describe('Schema Validation', () => {
    it('should reject missing searchType', async () => {
      const args: Partial<inputType> = {
        searchTerm: 'test',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(result.content[0].text).toContain('searchType');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should reject missing searchTerm for BOARD search', async () => {
      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD,
        // searchTerm is missing
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(result.content[0].text).toContain('searchTerm');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should reject missing searchTerm for DOCUMENTS search', async () => {
      const args: Partial<inputType> = {
        searchType: GlobalSearchType.DOCUMENTS,
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(result.content[0].text).toContain('searchTerm');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should reject empty string searchTerm', async () => {
      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: '',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should validate limit does not exceed SEARCH_LIMIT (20)', async () => {
      const args: Partial<inputType> = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'test',
        limit: 21, // exceeds max
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should accept limit at exactly SEARCH_LIMIT (20)', async () => {
      mocks.setResponse(mockDevBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'test',
        limit: 20,
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });

    it('should reject unsupported search type', async () => {
      const args: Omit<inputType, 'searchType'> & { searchType: string } = {
        searchType: 'UNSUPPORTED_TYPE',
        searchTerm: 'test',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Board Search Handler', () => {
    describe('Success Cases', () => {
      it('should search boards with searchTerm', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(3);
        expect(parsedResult.data[0]).toEqual({
          id: '123',
          title: 'Test Board 1',
          url: 'https://monday.com/boards/123',
        });
        expect(parsedResult.data[1]).toEqual({
          id: '456',
          title: 'Test Board 2',
          url: 'https://monday.com/boards/456',
        });

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query SearchBoards'),
          {
            query: 'Test',
            limit: 20,
            workspaceIds: undefined,
          },
          expect.objectContaining({ timeout: expect.any(Number) }),
        );
      });

      it('should return raw IDs without prefix', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data[0].id).toBe('123');
        expect(parsedResult.data[1].id).toBe('456');
        expect(parsedResult.data[2].id).toBe('789');
      });

      it('should pass workspaceIds filter', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
          workspaceIds: [12345, 67890],
        };

        await callToolByNameAsync('search', args);

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query SearchBoards'),
          expect.objectContaining({
            workspaceIds: ['12345', '67890'],
          }),
          expect.objectContaining({ timeout: expect.any(Number) }),
        );
      });

      it('should pass custom limit', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
          limit: 15,
        };

        await callToolByNameAsync('search', args);

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query SearchBoards'),
          expect.objectContaining({ limit: 15 }),
          expect.objectContaining({ timeout: expect.any(Number) }),
        );
      });

      it('should not include disclaimer in result', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should handle empty results', async () => {
        mocks.setResponse({ search: { boards: { results: [] } } });

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'NonExistent',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(0);
      });

      it('should return correct result format with message and data', async () => {
        mocks.setResponse(mockDevBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const result = await callToolByNameAsync('search', args);

        expect(result.message).toBe('Search results');
        expect(result.data).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      it('should propagate errors without fallback', async () => {
        const errorMessage = 'Endpoint unavailable';
        mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should propagate timeout errors without fallback', async () => {
        const errorMessage = 'Request timeout';
        mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should translate AbortError into user-friendly timeout message', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mocks.getMockRequest().mockRejectedValueOnce(abortError);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Search has timed out, try providing alternative search term');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should propagate GraphQL error directly', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch boards';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Test',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Documents Search Handler', () => {
    describe('Success Cases', () => {
      it('should search documents with searchTerm', async () => {
        mocks.setResponse(mockDevDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(3);
        expect(parsedResult.data[0]).toEqual({
          id: '111',
          title: 'Document 1',
        });
        expect(parsedResult.data[1]).toEqual({
          id: '222',
          title: 'Document 2',
        });

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query SearchDocs'),
          {
            query: 'Document',
            limit: 20,
            workspaceIds: undefined,
          },
          expect.objectContaining({ timeout: expect.any(Number) }),
        );
      });

      it('should return raw IDs without prefix', async () => {
        mocks.setResponse(mockDevDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data[0].id).toBe('111');
        expect(parsedResult.data[1].id).toBe('222');
        expect(parsedResult.data[2].id).toBe('333');
      });

      it('should pass workspaceIds filter', async () => {
        mocks.setResponse(mockDevDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
          workspaceIds: [11111, 22222],
        };

        await callToolByNameAsync('search', args);

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query SearchDocs'),
          expect.objectContaining({
            workspaceIds: ['11111', '22222'],
          }),
          expect.objectContaining({ timeout: expect.any(Number) }),
        );
      });

      it('should not include url field for documents', async () => {
        mocks.setResponse(mockDevDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data[0].url).toBeUndefined();
        expect(parsedResult.data[1].url).toBeUndefined();
      });

      it('should not include disclaimer in result', async () => {
        mocks.setResponse(mockDevDocsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should handle empty results', async () => {
        mocks.setResponse({ search: { docs: { results: [] } } });

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'NonExistent',
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('should propagate errors without fallback', async () => {
        const errorMessage = 'Endpoint unavailable';
        mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should handle GraphQL error for documents', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch documents';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Folders Search Handler', () => {
    describe('Success Cases', () => {
      it('should search folders with searchTerm and workspaceIds via getFolders query', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Folder',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(expect.stringContaining('query GetFolders'), {
          page: 1,
          limit: 100,
          workspace_ids: ['1'],
        });

        expect(parsedResult.data).toBeDefined();
      });

      it('should return raw IDs without prefix', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Folder',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data[0].id).toBe('100');
        expect(parsedResult.data[1].id).toBe('200');
        expect(parsedResult.data[2].id).toBe('300');
      });

      it('should not include url field for folders', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Folder',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data[0].url).toBeUndefined();
        expect(parsedResult.data[1].url).toBeUndefined();
        expect(parsedResult.data[2].url).toBeUndefined();
      });

      it('should filter results by searchTerm (case-insensitive)', async () => {
        const foldersResponse: GetFoldersQuery = {
          folders: [
            { id: '1', name: 'Test Folder Alpha' },
            { id: '2', name: 'Another Folder' },
            { id: '3', name: 'TEST FOLDER BETA' },
            { id: '4', name: 'Completely Unrelated' },
            { id: '5', name: 'test folder gamma' },
          ],
        };

        mocks.setResponse(foldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'test folder',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Only folders matching 'test folder' (case-insensitive) should be returned
        expect(parsedResult.data).toHaveLength(3);
        parsedResult.data.forEach((result: SearchResult) => {
          expect(result.title.toLowerCase()).toContain('test folder');
        });
      });

      it('should respect limit param when slicing filtered results', async () => {
        const foldersResponse: GetFoldersQuery = {
          folders: Array.from({ length: 50 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Test Folder ${i + 1}`,
          })),
        };

        mocks.setResponse(foldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test Folder',
          workspaceIds: [1],
          limit: 10,
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // All 50 match, but limit is 10
        expect(parsedResult.data).toHaveLength(10);
      });

      it('should return matching folders when some do not match searchTerm', async () => {
        const foldersResponse: GetFoldersQuery = {
          folders: [
            { id: '1', name: 'Marketing Folder' },
            { id: '2', name: 'Engineering Folder' },
            { id: '3', name: 'Marketing Assets' },
            { id: '4', name: 'Design Folder' },
          ],
        };

        mocks.setResponse(foldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Marketing',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(2);
        parsedResult.data.forEach((result: SearchResult) => {
          expect(result.title).toContain('Marketing');
        });
      });

      it('should handle empty folders response', async () => {
        mocks.setResponse({ folders: [] });

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(0);
      });

      it('should handle null folders response', async () => {
        mocks.setResponse({ folders: null });

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test',
          workspaceIds: [1],
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.data).toHaveLength(0);
      });

      it('should handle multiple workspace IDs', async () => {
        mocks.setResponse(mockFoldersResponse);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Folder',
          workspaceIds: [1, 2, 3],
        };

        await callToolByNameAsync('search', args);

        expect(mocks.getMockRequest()).toHaveBeenCalledWith(
          expect.stringContaining('query GetFolders'),
          expect.objectContaining({
            workspace_ids: ['1', '2', '3'],
          }),
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error when workspaceIds are not provided for folder search', async () => {
        const args: Partial<inputType> = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test',
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain('Searching for folders require specifying workspace ids');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should handle GraphQL error for folders', async () => {
        const errorMessage = 'GraphQL error: Failed to fetch folders';
        mocks.setError(errorMessage);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Test',
          workspaceIds: [1],
        };

        const result = await callToolByNameRawAsync('search', args);

        expect(result.content[0].text).toContain('Failed to execute tool search');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Items Search Handler', () => {
    const mockItemsResponse: SearchItemsQuery = {
      search: {
        items: {
          results: [
            {
              id: '111',
              indexed_data: { id: '111', name: 'Item One', url: 'https://monday.com/boards/1/pulses/111' },
            },
            {
              id: '222',
              indexed_data: { id: '222', name: 'Item Two', url: 'https://monday.com/boards/1/pulses/222' },
            },
          ],
        },
      },
    };

    it('should search items with searchTerm via searchItems query', async () => {
      mocks.setResponse(mockItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.data[0]).toEqual({
        id: '111',
        title: 'Item One',
        url: 'https://monday.com/boards/1/pulses/111',
      });
      expect(parsedResult.data[1]).toEqual({
        id: '222',
        title: 'Item Two',
        url: 'https://monday.com/boards/1/pulses/222',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchItems'),
        {
          query: 'Item',
          limit: 20,
          workspaceIds: undefined,
        },
        expect.not.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should return raw IDs without prefix', async () => {
      mocks.setResponse(mockItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].id).toBe('111');
      expect(parsedResult.data[1].id).toBe('222');
    });

    it('should pass custom limit to the request', async () => {
      mocks.setResponse(mockItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
        limit: 10,
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchItems'),
        expect.objectContaining({ limit: 10 }),
        expect.any(Object),
      );
    });

    it('should pass workspaceIds to the request', async () => {
      mocks.setResponse(mockItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
        workspaceIds: [12345, 67890],
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchItems'),
        expect.objectContaining({ workspaceIds: ['12345', '67890'] }),
        expect.any(Object),
      );
    });

    it('should not include disclaimer for items', async () => {
      mocks.setResponse(mockItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.disclaimer).toBeUndefined();
    });

    it('should handle empty results', async () => {
      mocks.setResponse({ search: { items: { results: [] } } });

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'NonExistent',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(0);
    });

    it('should not fall back when the request fails for items', async () => {
      const errorMessage = 'Search endpoint unavailable';
      mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

      const args: inputType = {
        searchType: GlobalSearchType.ITEMS,
        searchTerm: 'Item',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search');
      expect(result.content[0].text).toContain(errorMessage);
      // Only one call — no fallback
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workspaces Search Handler', () => {
    const mockWorkspacesResponse: SearchWorkspacesQuery = {
      search: {
        workspaces: {
          results: [
            { id: '10', indexed_data: { id: '10', name: 'Marketing Workspace', description: 'For marketing team' } },
            { id: '20', indexed_data: { id: '20', name: 'Engineering', description: 'Engineering workspace' } },
          ],
        },
      },
    };

    it('should search workspaces with searchTerm via searchWorkspaces query', async () => {
      mocks.setResponse(mockWorkspacesResponse);

      const args: inputType = {
        searchType: GlobalSearchType.WORKSPACES,
        searchTerm: 'Marketing',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.data[0]).toEqual({
        id: '10',
        title: 'Marketing Workspace',
        description: 'For marketing team',
      });
      expect(parsedResult.data[1]).toEqual({
        id: '20',
        title: 'Engineering',
        description: 'Engineering workspace',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchWorkspaces'),
        {
          query: 'Marketing',
          limit: 20,
        },
        expect.not.objectContaining({ versionOverride: 'dev' }),
      );
    });

    it('should return raw IDs without prefix', async () => {
      mocks.setResponse(mockWorkspacesResponse);

      const args: inputType = {
        searchType: GlobalSearchType.WORKSPACES,
        searchTerm: 'test',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].id).toBe('10');
      expect(parsedResult.data[1].id).toBe('20');
    });

    it('should handle empty results', async () => {
      mocks.setResponse({ search: { workspaces: { results: [] } } });

      const args: inputType = {
        searchType: GlobalSearchType.WORKSPACES,
        searchTerm: 'NonExistent',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(0);
    });

    it('should handle null description in workspace results', async () => {
      const responseWithNullDesc: SearchWorkspacesQuery = {
        search: {
          workspaces: {
            results: [{ id: '30', indexed_data: { id: '30', name: 'Sales Team', description: null } }],
          },
        },
      };
      mocks.setResponse(responseWithNullDesc);

      const args: inputType = {
        searchType: GlobalSearchType.WORKSPACES,
        searchTerm: 'Sales',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].description).toBeUndefined();
    });

    it('should not fall back when the request fails for workspaces', async () => {
      const errorMessage = 'Search endpoint unavailable';
      mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

      const args: inputType = {
        searchType: GlobalSearchType.WORKSPACES,
        searchTerm: 'Marketing',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search');
      expect(result.content[0].text).toContain(errorMessage);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  describe('Updates Search Handler', () => {
    const mockUpdatesResponse: SearchUpdatesQuery = {
      search: {
        updates: {
          results: [
            {
              id: '10',
              indexed_data: {
                id: '10',
                body: 'Deploy is done',
                creator_id: '501',
                item_id: '901',
                board_id: '801',
              },
            },
            {
              id: '20',
              indexed_data: {
                id: '20',
                body: 'Reviewing the PR',
                creator_id: '502',
                item_id: '902',
                board_id: '802',
              },
            },
          ],
        },
      },
    };

    it('should search updates with searchTerm via searchUpdates query', async () => {
      mocks.setResponse(mockUpdatesResponse);

      const args: inputType = {
        searchType: GlobalSearchType.UPDATES,
        searchTerm: 'Deploy',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.data[0]).toEqual({
        id: '10',
        title: 'Deploy is done',
        itemId: '901',
        boardId: '801',
        creatorId: '501',
      });
      expect(parsedResult.data[1]).toEqual({
        id: '20',
        title: 'Reviewing the PR',
        itemId: '902',
        boardId: '802',
        creatorId: '502',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchUpdates'),
        {
          query: 'Deploy',
          limit: 20,
          boardIds: undefined,
          creatorIds: undefined,
        },
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('should return raw IDs without prefix', async () => {
      mocks.setResponse(mockUpdatesResponse);

      const args: inputType = {
        searchType: GlobalSearchType.UPDATES,
        searchTerm: 'test',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].id).toBe('10');
      expect(parsedResult.data[1].id).toBe('20');
    });

    it('should pass boardIds and creatorIds to the updates query', async () => {
      mocks.setResponse(mockUpdatesResponse);

      const args: inputType = {
        searchType: GlobalSearchType.UPDATES,
        searchTerm: 'Deploy',
        boardIds: [801, 802],
        creatorIds: [501],
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchUpdates'),
        {
          query: 'Deploy',
          limit: 20,
          boardIds: ['801', '802'],
          creatorIds: ['501'],
        },
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('should handle empty results', async () => {
      mocks.setResponse({ search: { updates: { results: [] } } });

      const args: inputType = {
        searchType: GlobalSearchType.UPDATES,
        searchTerm: 'NonExistent',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(0);
    });

    it('should not fall back when the request fails for updates', async () => {
      const errorMessage = 'Search endpoint unavailable';
      mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

      const args: inputType = {
        searchType: GlobalSearchType.UPDATES,
        searchTerm: 'Deploy',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search');
      expect(result.content[0].text).toContain(errorMessage);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeline Items Search Handler', () => {
    const mockTimelineItemsResponse: SearchTimelineItemsQuery = {
      search: {
        timeline_items: {
          results: [
            {
              id: '10',
              indexed_data: {
                id: '10',
                title: 'Kickoff email',
                summary: 'Project kickoff summary',
                content: 'Full kickoff email body',
              },
            },
            {
              id: '20',
              indexed_data: {
                id: '20',
                title: 'Weekly sync',
                summary: 'Notes from the weekly sync',
                content: 'Full weekly sync notes',
              },
            },
          ],
        },
      },
    };

    it('should search timeline items with searchTerm via searchTimelineItems query', async () => {
      mocks.setResponse(mockTimelineItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.TIMELINE_ITEMS,
        searchTerm: 'kickoff',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.data[0]).toEqual({
        id: '10',
        title: 'Kickoff email',
        summary: 'Project kickoff summary',
        content: 'Full kickoff email body',
      });
      expect(parsedResult.data[1]).toEqual({
        id: '20',
        title: 'Weekly sync',
        summary: 'Notes from the weekly sync',
        content: 'Full weekly sync notes',
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchTimelineItems'),
        {
          query: 'kickoff',
          limit: 20,
        },
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });

    it('should return raw IDs without prefix', async () => {
      mocks.setResponse(mockTimelineItemsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.TIMELINE_ITEMS,
        searchTerm: 'test',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].id).toBe('10');
      expect(parsedResult.data[1].id).toBe('20');
    });

    it('should handle empty results', async () => {
      mocks.setResponse({ search: { timeline_items: { results: [] } } });

      const args: inputType = {
        searchType: GlobalSearchType.TIMELINE_ITEMS,
        searchTerm: 'NonExistent',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(0);
    });

    it('should omit summary and content when empty', async () => {
      const responseWithEmptySummary: SearchTimelineItemsQuery = {
        search: {
          timeline_items: {
            results: [{ id: '30', indexed_data: { id: '30', title: 'Untitled note', summary: '', content: '' } }],
          },
        },
      };
      mocks.setResponse(responseWithEmptySummary);

      const args: inputType = {
        searchType: GlobalSearchType.TIMELINE_ITEMS,
        searchTerm: 'note',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data[0].summary).toBeUndefined();
      expect(parsedResult.data[0].content).toBeUndefined();
    });

    it('should not fall back when the request fails for timeline items', async () => {
      const errorMessage = 'Search endpoint unavailable';
      mocks.getMockRequest().mockRejectedValueOnce(new Error(errorMessage));

      const args: inputType = {
        searchType: GlobalSearchType.TIMELINE_ITEMS,
        searchTerm: 'kickoff',
      };

      const result = await callToolByNameRawAsync('search', args);

      expect(result.content[0].text).toContain('Failed to execute tool search');
      expect(result.content[0].text).toContain(errorMessage);
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default Values', () => {
    it('should use default limit of 20 when not specified', async () => {
      mocks.setResponse(mockDevBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Test',
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchBoards'),
        expect.objectContaining({
          limit: 20,
        }),
        expect.any(Object),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle limit of 1', async () => {
      mocks.setResponse({
        search: {
          boards: {
            results: [
              { id: '123', indexed_data: { id: '123', name: 'Test Board 1', url: 'https://monday.com/boards/123' } },
            ],
          },
        },
      });

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Test',
        limit: 1,
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(1);
    });

    it('should handle boards with null name fields gracefully', async () => {
      mocks.setResponse({
        search: {
          boards: {
            results: [{ id: '1', indexed_data: { id: '1', name: null as any, url: 'https://monday.com/boards/1' } }],
          },
        },
      });

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Test',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(1);
      expect(parsedResult.data[0].title).toBeNull();
    });

    it('should handle documents with null name fields gracefully', async () => {
      mocks.setResponse({
        search: {
          docs: {
            results: [{ id: '1', indexed_data: { id: '1', name: null as any } }],
          },
        },
      });

      const args: inputType = {
        searchType: GlobalSearchType.DOCUMENTS,
        searchTerm: 'Doc',
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(1);
      expect(parsedResult.data[0].title).toBeNull();
    });

    it('should handle folders with null name fields gracefully', async () => {
      mocks.setResponse({ folders: [{ id: '1', name: null as any }] });

      const args: inputType = {
        searchType: GlobalSearchType.FOLDERS,
        searchTerm: 'Test',
        workspaceIds: [1],
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.data).toHaveLength(0); // null name filtered out by searchTerm match
    });

    it('should handle multiple workspace IDs for board search', async () => {
      mocks.setResponse(mockDevBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Test',
        workspaceIds: [1, 2, 3, 4, 5],
      };

      await callToolByNameAsync('search', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query SearchBoards'),
        expect.objectContaining({
          workspaceIds: ['1', '2', '3', '4', '5'],
        }),
        expect.any(Object),
      );
    });
  });
});
