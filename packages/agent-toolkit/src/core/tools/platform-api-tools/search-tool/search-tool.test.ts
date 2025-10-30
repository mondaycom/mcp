import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { SearchTool, searchSchema } from './search-tool';
import { z, ZodTypeAny } from 'zod';
import { GetBoardsQuery, GetDocsQuery, GetFoldersQuery } from 'src/monday-graphql';
import { GlobalSearchType, ObjectPrefixes, SearchResult } from './search-tool.types';

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

      it('should search boards with searchTerm but NOT filter when less than 100 items', async () => {
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

        // With less than 100 items, no filtering occurs - returns all items
        expect(parsedResult.results).toHaveLength(4);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');

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

    describe('Virtual Pagination with Search Term (Less than 100 items)', () => {
      it('should NOT filter when less than 100 items - returns all items', async () => {
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

        // With less than 100 items, no filtering occurs - returns all 10 items
        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
      });

      it('should NOT filter when less than 100 items even with different page', async () => {
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

        // With less than 100 items, no filtering occurs - returns all 10 items
        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
      });

      it('should NOT filter when less than 100 items with mixed names', async () => {
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

        // With less than 100 items, returns all items without filtering
        expect(parsedResult.results).toHaveLength(3);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
      });

      it('should NOT filter when less than 100 items even with non-matching search term', async () => {
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
          limit: 2
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // With less than 100 items, returns all 5 items (no filtering)
        expect(parsedResult.results).toHaveLength(5);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
      });
    });

    describe('Virtual Pagination with Filtering (More than 100 items)', () => {
      it('should filter and paginate when more than 100 items - page 1', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 10,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // With more than 100 items, filtering occurs
        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.results[0].title).toBe('Board 1');
        expect(parsedResult.results[9].title).toBe('Board 10');
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should filter and paginate when more than 100 items - page 2', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 10,
          page: 2
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Page 2 should contain items 11-20
        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.results[0].title).toBe('Board 11');
        expect(parsedResult.results[9].title).toBe('Board 20');
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should filter out non-matching items when more than 100 items', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: [
            ...Array.from({ length: 80 }, (_, i) => ({
              id: `${i + 1}`,
              name: `Project ${i + 1}`,
              url: `https://monday.com/boards/${i + 1}`
            })),
            ...Array.from({ length: 30 }, (_, i) => ({
              id: `${i + 81}`,
              name: `Task ${i + 1}`,
              url: `https://monday.com/boards/${i + 81}`
            }))
          ]
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Project',
          limit: 20,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Should only return items matching 'Project' (80 total, showing first 20)
        expect(parsedResult.results).toHaveLength(20);
        expect(parsedResult.results[0].title).toBe('Project 1');
        expect(parsedResult.results[19].title).toBe('Project 20');
        // Verify no 'Task' items are included
        parsedResult.results.forEach((result: SearchResult) => {
          expect(result.title).toContain('Project');
        });
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should handle case-insensitive filtering when more than 100 items', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: i % 3 === 0 ? `TEST Board ${i + 1}` : i % 3 === 1 ? `test board ${i + 1}` : `TeSt BoArD ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'test board',
          limit: 15,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Should match all case variations
        expect(parsedResult.results).toHaveLength(15);
        parsedResult.results.forEach((result: SearchResult) => {
          expect(result.title.toLowerCase()).toContain('test board');
        });
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should return empty results when page exceeds filtered results', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 10,
          page: 100 // Way beyond available pages
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(0);
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should handle partial last page when more than 100 items', async () => {
        const largeBoardsResponse: GetBoardsQuery = {
          boards: Array.from({ length: 125 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Board ${i + 1}`,
            url: `https://monday.com/boards/${i + 1}`
          }))
        };

        mocks.setResponse(largeBoardsResponse);

        const args: inputType = {
          searchType: GlobalSearchType.BOARD,
          searchTerm: 'Board',
          limit: 10,
          page: 13 // Last page should have 5 items
        };

        const parsedResult = await callToolByNameAsync('search', args);

        // Page 13: items 121-125 (5 items)
        expect(parsedResult.results).toHaveLength(5);
        expect(parsedResult.results[0].title).toBe('Board 121');
        expect(parsedResult.results[4].title).toBe('Board 125');
        expect(parsedResult.disclaimer).toBeUndefined();
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

      it('should search documents with searchTerm but NOT filter when less than 100 items', async () => {
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

        // With less than 100 items, no filtering occurs - returns all items
        expect(parsedResult.results).toHaveLength(4);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');

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

    describe('Virtual Pagination with Filtering (More than 100 items)', () => {
      it('should filter and paginate documents when more than 100 items', async () => {
        const largeDocs: GetDocsQuery = {
          docs: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Document ${i + 1}`,
            url: `https://monday.com/docs/${i + 1}`
          }))
        };

        mocks.setResponse(largeDocs);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Document',
          limit: 10,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.results[0].title).toBe('Document 1');
        expect(parsedResult.results[9].title).toBe('Document 10');
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should filter out non-matching documents when more than 100 items', async () => {
        const largeDocs: GetDocsQuery = {
          docs: [
            ...Array.from({ length: 90 }, (_, i) => ({
              id: `${i + 1}`,
              name: `Report ${i + 1}`,
              url: `https://monday.com/docs/${i + 1}`
            })),
            ...Array.from({ length: 20 }, (_, i) => ({
              id: `${i + 91}`,
              name: `Guide ${i + 1}`,
              url: `https://monday.com/docs/${i + 91}`
            }))
          ]
        };

        mocks.setResponse(largeDocs);

        const args: inputType = {
          searchType: GlobalSearchType.DOCUMENTS,
          searchTerm: 'Report',
          limit: 15,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(15);
        parsedResult.results.forEach((result: SearchResult) => {
          expect(result.title).toContain('Report');
        });
        expect(parsedResult.disclaimer).toBeUndefined();
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

      it('should search folders with searchTerm but NOT filter when less than 100 items', async () => {
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

        // With less than 100 items, no filtering occurs - returns all items
        expect(parsedResult.results).toHaveLength(4);
        expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');

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

    describe('Virtual Pagination with Filtering (More than 100 items)', () => {
      it('should filter and paginate folders when more than 100 items', async () => {
        const largeFolders: GetFoldersQuery = {
          folders: Array.from({ length: 150 }, (_, i) => ({
            id: `${i + 1}`,
            name: `Folder ${i + 1}`
          }))
        };

        mocks.setResponse(largeFolders);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Folder',
          limit: 10,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(10);
        expect(parsedResult.results[0].title).toBe('Folder 1');
        expect(parsedResult.results[9].title).toBe('Folder 10');
        expect(parsedResult.disclaimer).toBeUndefined();
      });

      it('should filter out non-matching folders when more than 100 items', async () => {
        const largeFolders: GetFoldersQuery = {
          folders: [
            ...Array.from({ length: 85 }, (_, i) => ({
              id: `${i + 1}`,
              name: `Archive ${i + 1}`
            })),
            ...Array.from({ length: 25 }, (_, i) => ({
              id: `${i + 86}`,
              name: `Active ${i + 1}`
            }))
          ]
        };

        mocks.setResponse(largeFolders);

        const args: inputType = {
          searchType: GlobalSearchType.FOLDERS,
          searchTerm: 'Archive',
          limit: 20,
          page: 1
        };

        const parsedResult = await callToolByNameAsync('search', args);

        expect(parsedResult.results).toHaveLength(20);
        parsedResult.results.forEach((result: SearchResult) => {
          expect(result.title).toContain('Archive');
        });
        expect(parsedResult.disclaimer).toBeUndefined();
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
    it('should return all items when count is less than 100', async () => {
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
        limit: 10
      };

      const parsedResult = await callToolByNameAsync('search', args);

      // Less than 100 items, returns all without filtering
      expect(parsedResult.results).toHaveLength(2);
      expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
    });

    it('should slice results correctly for page 1 when more than 100 items', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 120 }, (_, i) => ({
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
      expect(parsedResult.disclaimer).toBeUndefined();
    });

    it('should slice results correctly for page 2 when more than 100 items', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 120 }, (_, i) => ({
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
      expect(parsedResult.disclaimer).toBeUndefined();
    });

    it('should slice results correctly for last partial page when more than 100 items', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 112 }, (_, i) => ({
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
        page: 23
      };

      const parsedResult = await callToolByNameAsync('search', args);

      // Page 23: items 111-112 (2 items)
      expect(parsedResult.results).toHaveLength(2);
      expect(parsedResult.results[0].title).toBe('Board 111');
      expect(parsedResult.results[1].title).toBe('Board 112');
      expect(parsedResult.disclaimer).toBeUndefined();
    });

    it('should return empty array when page exceeds available results with more than 100 items', async () => {
      const largeResponse: GetBoardsQuery = {
        boards: Array.from({ length: 115 }, (_, i) => ({
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
        page: 100 // way beyond available data
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(0);
      expect(parsedResult.disclaimer).toBeUndefined();
    });

    it('should handle special characters in search term when less than 100 items', async () => {
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

      // Less than 100 items, returns all
      expect(parsedResult.results).toHaveLength(3);
      expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
    });

    it('should handle empty search term as no filter', async () => {
      // Mock returns only 2 items as per the pagination parameters
      const boardsResponse: GetBoardsQuery = {
        boards: [
          { id: '1', name: 'Alpha', url: 'https://monday.com/boards/1' },
          { id: '2', name: 'Beta', url: 'https://monday.com/boards/2' }
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

      // Empty string is falsy, so regular pagination (not virtual) - API returns 2 items
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
      // Mock returns only 1 item as per the pagination parameters
      const singleBoardResponse: GetBoardsQuery = {
        boards: [
          { id: '123', name: 'Test Board 1', url: 'https://monday.com/boards/123' }
        ]
      };

      mocks.setResponse(singleBoardResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        limit: 1
      };

      const parsedResult = await callToolByNameAsync('search', args);

      expect(parsedResult.results).toHaveLength(1);
    });

    it('should handle very high page number with less than 100 results - returns all', async () => {
      mocks.setResponse(mockBoardsResponse);

      const args: inputType = {
        searchType: GlobalSearchType.BOARD,
        searchTerm: 'Board',
        limit: 2,
        page: 1000
      };

      const parsedResult = await callToolByNameAsync('search', args);

      // Less than 100 items, no filtering occurs - returns all 3 items
      expect(parsedResult.results).toHaveLength(3);
      expect(parsedResult.disclaimer).toBe('[IMPORTANT]Items were not filtered. Please perform the filtering.');
    });
  });
});

