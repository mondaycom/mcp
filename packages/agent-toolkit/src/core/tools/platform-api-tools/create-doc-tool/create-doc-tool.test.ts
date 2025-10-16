import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { createDocToolSchema } from './create-doc-tool';
import { BoardKind, ColumnType } from 'src/monday-graphql';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof createDocToolSchema, ZodTypeAny>;

describe('CreateDocTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Workspace Document Tests (type: workspace)', () => {
    describe('Success Cases', () => {
      it('should create workspace doc with all parameters', async () => {
        const createDocResponse = {
          create_doc: {
            id: 'doc_123',
            url: 'https://monday.com/docs/doc_123',
            name: 'Test Document',
          },
        };

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1', 'block_2'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Test Document',
          markdown: '# Hello World\n\nThis is a test document.',
          doc_kind: BoardKind.Private,
          folder_id: 67890,
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('✅ Document successfully created');
        expect(result.content[0].text).toContain('doc_123');
        expect(result.content[0].text).toContain('https://monday.com/docs/doc_123');

        const mockCalls = mocks.getMockRequest().mock.calls;
        const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
        expect(createDocCall).toBeDefined();
        expect(createDocCall[1]).toEqual({
          location: {
            workspace: {
              workspace_id: '12345',
              name: 'Test Document',
              kind: BoardKind.Private,
              folder_id: '67890',
            },
          },
        });

        const addContentCall = mockCalls.find((call) => call[0].includes('mutation addContentToDocFromMarkdown'));
        expect(addContentCall).toBeDefined();
        expect(addContentCall[1]).toEqual({
          docId: 'doc_123',
          markdown: '# Hello World\n\nThis is a test document.',
        });
      });

      it('should create workspace doc with minimal parameters and default to Public kind', async () => {
        const createDocResponse = {
          create_doc: {
            id: 'doc_456',
            url: 'https://monday.com/docs/doc_456',
            name: 'Minimal Doc',
          },
        };

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Minimal Doc',
          markdown: 'Simple content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('✅ Document successfully created');
        expect(result.content[0].text).toContain('doc_456');

        const mockCalls = mocks.getMockRequest().mock.calls;
        const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
        expect(createDocCall).toBeDefined();
        expect(createDocCall[1].location.workspace.kind).toBe(BoardKind.Public);
        expect(createDocCall[1].location.workspace.folder_id).toBeUndefined();
      });

      it('should create workspace doc with different doc_kind values', async () => {
        const docKinds = [BoardKind.Private, BoardKind.Public, BoardKind.Share];

        for (const kind of docKinds) {
          jest.clearAllMocks();

          const createDocResponse = {
            create_doc: {
              id: `doc_${kind}`,
              url: `https://monday.com/docs/doc_${kind}`,
              name: `Doc ${kind}`,
            },
          };

          const addContentResponse = {
            add_content_to_doc_from_markdown: {
              success: true,
              block_ids: ['block_1'],
              error: null,
            },
          };

          jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
            if (query.includes('mutation createDoc')) {
              return Promise.resolve(createDocResponse);
            }
            if (query.includes('mutation addContentToDocFromMarkdown')) {
              return Promise.resolve(addContentResponse);
            }
            return Promise.resolve({});
          });

          const args: inputType = {
            location: 'workspace',
            workspace_id: 12345,
            doc_name: `Doc ${kind}`,
            markdown: 'Content',
            doc_kind: kind,
          };

          const result = await callToolByNameRawAsync('create_doc', args);

          expect(result.content[0].text).toContain('✅ Document successfully created');

          const mockCalls = mocks.getMockRequest().mock.calls;
          const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
          expect(createDocCall[1].location.workspace.kind).toBe(kind);
        }
      });
    });

    describe('Validation Errors', () => {
      it('should return error when workspace_id is missing', async () => {
        const args: Partial<inputType> = {
          location: 'workspace',
          doc_name: 'Test Document',
          markdown: 'Content',
          // workspace_id is missing
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('Required parameters were not provided for location parameter of workspace');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should handle missing doc_name via schema validation', async () => {
        const args: Partial<inputType> = {
          location: 'workspace',
          workspace_id: 12345,
          markdown: 'Content',
          // doc_name is missing
        };

        const result = await callToolByNameRawAsync('create_doc', args);
        expect(result.content[0].text).toContain('Failed to execute tool create_doc: Invalid arguments');
        expect(result.content[0].text).toContain('doc_name');
        expect(result.content[0].text).toContain('Required');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should handle missing markdown via schema validation', async () => {
        const args: Partial<inputType> = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Test Document',
          // markdown is missing
        };

        const result = await callToolByNameRawAsync('create_doc', args);
        expect(result.content[0].text).toContain('Failed to execute tool create_doc: Invalid arguments');
        expect(result.content[0].text).toContain('markdown');
        expect(result.content[0].text).toContain('Required');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should return error when createDoc mutation fails and docId is undefined', async () => {
        const createDocResponse = {
          create_doc: null,
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toBe('Error: Failed to create document.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should return error when addContentToDocFromMarkdown fails', async () => {
        const createDocResponse = {
          create_doc: {
            id: 'doc_789',
            url: 'https://monday.com/docs/doc_789',
            name: 'Test Document',
          },
        };

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: false,
            block_ids: null,
            error: 'Invalid markdown format',
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Test Document',
          markdown: 'Invalid content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('Document doc_789 created');
        expect(result.content[0].text).toContain('failed to add markdown content');
        expect(result.content[0].text).toContain('Invalid markdown format');
      });

      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          location: 'workspace',
          workspace_id: 12345,
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('Error creating document');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Item Document Tests (type: item)', () => {
    describe('Success Cases', () => {
      it('should create item doc with column_id provided', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_123',
              board: {
                id: 'board_456',
                columns: [
                  { id: 'doc_col_1', type: ColumnType.Doc },
                  { id: 'text_col_1', type: ColumnType.Text },
                ],
              },
            },
          ],
        };

        const createDocResponse = {
          create_doc: {
            id: 'doc_item_123',
            url: 'https://monday.com/docs/doc_item_123',
            name: null,
          },
        };

        const updateDocNameResponse = true;

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation updateDocName')) {
            return Promise.resolve({ update_doc_name: updateDocNameResponse });
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 123,
          column_id: 'doc_col_1',
          doc_name: 'Item Document',
          markdown: '# Item Doc Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('✅ Document successfully created');
        expect(result.content[0].text).toContain('doc_item_123');

        const mockCalls = mocks.getMockRequest().mock.calls;

        const getItemCall = mockCalls.find((call) => call[0].includes('query getItemBoard'));
        expect(getItemCall).toBeDefined();
        expect(getItemCall[1]).toEqual({ itemId: '123' });

        const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
        expect(createDocCall).toBeDefined();
        expect(createDocCall[1]).toEqual({
          location: {
            board: {
              item_id: '123',
              column_id: 'doc_col_1',
            },
          },
        });

        const updateNameCall = mockCalls.find((call) => call[0].includes('mutation updateDocName'));
        expect(updateNameCall).toBeDefined();
        expect(updateNameCall[1]).toEqual({
          docId: 'doc_item_123',
          name: 'Item Document',
        });

        const addContentCall = mockCalls.find((call) => call[0].includes('mutation addContentToDocFromMarkdown'));
        expect(addContentCall).toBeDefined();
      });

      it('should create item doc without column_id when existing doc column found', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_456',
              board: {
                id: 'board_789',
                columns: [
                  { id: 'existing_doc_col', type: ColumnType.Doc },
                  { id: 'text_col_1', type: ColumnType.Text },
                ],
              },
            },
          ],
        };

        const createDocResponse = {
          create_doc: {
            id: 'doc_item_456',
            url: 'https://monday.com/docs/doc_item_456',
            name: null,
          },
        };

        const updateDocNameResponse = true;

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation updateDocName')) {
            return Promise.resolve({ update_doc_name: updateDocNameResponse });
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 456,
          // column_id not provided
          doc_name: 'Item Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('✅ Document successfully created');

        const mockCalls = mocks.getMockRequest().mock.calls;
        const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
        expect(createDocCall[1].location.board.column_id).toBe('existing_doc_col');

        // Verify createColumn was NOT called
        const createColumnCall = mockCalls.find((call) => call[0].includes('mutation createColumn'));
        expect(createColumnCall).toBeUndefined();
      });

      it('should create item doc without column_id and create new doc column when none exists', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_789',
              board: {
                id: 'board_111',
                columns: [
                  { id: 'text_col_1', type: ColumnType.Text },
                  { id: 'status_col_1', type: ColumnType.Status },
                ],
              },
            },
          ],
        };

        const createColumnResponse = {
          create_column: {
            id: 'new_doc_col',
          },
        };

        const createDocResponse = {
          create_doc: {
            id: 'doc_item_789',
            url: 'https://monday.com/docs/doc_item_789',
            name: null,
          },
        };

        const updateDocNameResponse = true;

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createColumn')) {
            return Promise.resolve(createColumnResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation updateDocName')) {
            return Promise.resolve({ update_doc_name: updateDocNameResponse });
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 789,
          // column_id not provided
          doc_name: 'Item Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('✅ Document successfully created');

        const mockCalls = mocks.getMockRequest().mock.calls;

        // Verify createColumn was called
        const createColumnCall = mockCalls.find((call) => call[0].includes('mutation createColumn'));
        expect(createColumnCall).toBeDefined();
        expect(createColumnCall[1]).toEqual({
          boardId: 'board_111',
          columnType: ColumnType.Doc,
          columnTitle: 'Doc',
        });

        // Verify the new column ID was used
        const createDocCall = mockCalls.find((call) => call[0].includes('mutation createDoc'));
        expect(createDocCall[1].location.board.column_id).toBe('new_doc_col');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when item_id is missing', async () => {
        const args: Partial<inputType> = {
          location: 'item',
          // item_id is missing
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('Required parameters were not provided for location parameter of item');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('Error Scenarios', () => {
      it('should return error when item does not exist', async () => {
        const getItemBoardResponse = {
          items: [],
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 999,
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toBe('Error: Item with id 999 not found.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
      });

      it('should return error when create column fails', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_999',
              board: {
                id: 'board_999',
                columns: [{ id: 'text_col', type: ColumnType.Text }],
              },
            },
          ],
        };

        const createColumnResponse = {
          create_column: null,
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createColumn')) {
            return Promise.resolve(createColumnResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 999,
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toBe('Error: Failed to create doc column.');
      });

      it('should handle updateDocName failure as non-fatal and continue', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_111',
              board: {
                id: 'board_111',
                columns: [{ id: 'doc_col_1', type: ColumnType.Doc }],
              },
            },
          ],
        };

        const createDocResponse = {
          create_doc: {
            id: 'doc_item_111',
            url: 'https://monday.com/docs/doc_item_111',
            name: null,
          },
        };

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: true,
            block_ids: ['block_1'],
            error: null,
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation updateDocName')) {
            return Promise.reject(new Error('Failed to update name'));
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 111,
          column_id: 'doc_col_1',
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        // Document should still be created successfully
        expect(result.content[0].text).toContain('✅ Document successfully created');
        expect(result.content[0].text).toContain('doc_item_111');

        // Verify console.warn was called
        expect(console.warn).toHaveBeenCalledWith('Failed to update doc name:', expect.any(Error));
      });

      it('should return error when createDoc mutation fails for item', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_222',
              board: {
                id: 'board_222',
                columns: [{ id: 'doc_col_1', type: ColumnType.Doc }],
              },
            },
          ],
        };

        const createDocResponse = {
          create_doc: null,
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 222,
          column_id: 'doc_col_1',
          doc_name: 'Test Document',
          markdown: 'Content',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toBe('Error: Failed to create document.');
      });

      it('should return error when addContentToDocFromMarkdown fails for item', async () => {
        const getItemBoardResponse = {
          items: [
            {
              id: 'item_333',
              board: {
                id: 'board_333',
                columns: [{ id: 'doc_col_1', type: ColumnType.Doc }],
              },
            },
          ],
        };

        const createDocResponse = {
          create_doc: {
            id: 'doc_item_333',
            url: 'https://monday.com/docs/doc_item_333',
            name: null,
          },
        };

        const updateDocNameResponse = true;

        const addContentResponse = {
          add_content_to_doc_from_markdown: {
            success: false,
            block_ids: null,
            error: 'Markdown parsing error',
          },
        };

        jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
          if (query.includes('query getItemBoard')) {
            return Promise.resolve(getItemBoardResponse);
          }
          if (query.includes('mutation createDoc')) {
            return Promise.resolve(createDocResponse);
          }
          if (query.includes('mutation updateDocName')) {
            return Promise.resolve({ update_doc_name: updateDocNameResponse });
          }
          if (query.includes('mutation addContentToDocFromMarkdown')) {
            return Promise.resolve(addContentResponse);
          }
          return Promise.resolve({});
        });

        const args: inputType = {
          location: 'item',
          item_id: 333,
          column_id: 'doc_col_1',
          doc_name: 'Test Document',
          markdown: 'Invalid markdown',
        };

        const result = await callToolByNameRawAsync('create_doc', args);

        expect(result.content[0].text).toContain('Document doc_item_333 created');
        expect(result.content[0].text).toContain('failed to add markdown content');
        expect(result.content[0].text).toContain('Markdown parsing error');
      });
    });
  });

});

