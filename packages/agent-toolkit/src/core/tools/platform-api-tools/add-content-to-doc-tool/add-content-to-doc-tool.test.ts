import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';

describe('AddContentToDocTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should add content with doc_id', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: ['block_1', 'block_2'],
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: '# Hello World\n\nNew content here.',
      });

      expect(result.content[0].text).toContain('Successfully added content to document doc_123');
      expect(result.content[0].text).toContain('2 blocks created');
      expect(result.content[0].text).toContain('block_1, block_2');

      const mockCalls = mocks.getMockRequest().mock.calls;
      const addContentCall = mockCalls.find((call: any) => call[0].includes('mutation addContentToDocFromMarkdown'));
      expect(addContentCall).toBeDefined();
      expect(addContentCall[1]).toEqual({
        docId: 'doc_123',
        markdown: '# Hello World\n\nNew content here.',
        afterBlockId: undefined,
      });
    });

    it('should resolve object_id and add content', async () => {
      const getDocResponse = {
        docs: [{ id: 'resolved_doc_456' }],
      };

      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: ['block_3'],
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getDocByObjectId')) {
          return Promise.resolve(getDocResponse);
        }
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        object_id: 'obj_789',
        markdown: 'Some content',
      });

      expect(result.content[0].text).toContain('Successfully added content to document resolved_doc_456');
      expect(result.content[0].text).toContain('1 block created');

      const mockCalls = mocks.getMockRequest().mock.calls;

      const resolveCall = mockCalls.find((call: any) => call[0].includes('query getDocByObjectId'));
      expect(resolveCall).toBeDefined();
      expect(resolveCall[1]).toEqual({ objectId: ['obj_789'] });

      const addContentCall = mockCalls.find((call: any) => call[0].includes('mutation addContentToDocFromMarkdown'));
      expect(addContentCall).toBeDefined();
      expect(addContentCall[1]).toEqual({
        docId: 'resolved_doc_456',
        markdown: 'Some content',
        afterBlockId: undefined,
      });
    });

    it('should use doc_id when both doc_id and object_id are provided', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: ['block_4'],
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_priority',
        object_id: 'obj_ignored',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Successfully added content to document doc_priority');

      const mockCalls = mocks.getMockRequest().mock.calls;

      // No resolution query should be made
      const resolveCall = mockCalls.find((call: any) => call[0].includes('query getDocByObjectId'));
      expect(resolveCall).toBeUndefined();

      const addContentCall = mockCalls.find((call: any) => call[0].includes('mutation addContentToDocFromMarkdown'));
      expect(addContentCall[1].docId).toBe('doc_priority');
    });

    it('should pass after_block_id to the mutation', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: ['block_5'],
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Inserted content',
        after_block_id: 'block_existing',
      });

      expect(result.content[0].text).toContain('Successfully added content to document doc_123');

      const mockCalls = mocks.getMockRequest().mock.calls;
      const addContentCall = mockCalls.find((call: any) => call[0].includes('mutation addContentToDocFromMarkdown'));
      expect(addContentCall[1]).toEqual({
        docId: 'doc_123',
        markdown: 'Inserted content',
        afterBlockId: 'block_existing',
      });
    });

    it('should handle empty block_ids in response', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: [],
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Successfully added content to document doc_123');
      expect(result.content[0].text).toContain('0 blocks created');
    });

    it('should handle null block_ids in successful response', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: true,
          block_ids: null,
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Successfully added content to document doc_123');
      expect(result.content[0].text).toContain('0 blocks created');
      expect(result.content[0].text).not.toContain('Block IDs:');
    });
  });

  describe('Error Cases', () => {
    it('should return error when mutation returns success=false with error message', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: false,
          block_ids: null,
          error: 'Invalid markdown format',
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Bad content',
      });

      expect(result.content[0].text).toContain('Error adding content to document');
      expect(result.content[0].text).toContain('Invalid markdown format');
    });

    it('should return error with unknown error fallback when mutation returns success=false without error', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: {
          success: false,
          block_ids: null,
          error: null,
        },
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error adding content to document');
      expect(result.content[0].text).toContain('Unknown error');
    });

    it('should return error when mutation returns null result', async () => {
      const addContentResponse = {
        add_content_to_doc_from_markdown: null,
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('mutation addContentToDocFromMarkdown')) {
          return Promise.resolve(addContentResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error: Failed to add content to document');
      expect(result.content[0].text).toContain('no response from API');
    });

    it('should return error when object_id resolution finds no documents', async () => {
      const getDocResponse = {
        docs: [],
      };

      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getDocByObjectId')) {
          return Promise.resolve(getDocResponse);
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        object_id: 'nonexistent_obj',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error: No document found for object_id nonexistent_obj');

      // Mutation should not have been called
      const mockCalls = mocks.getMockRequest().mock.calls;
      const addContentCall = mockCalls.find((call: any) => call[0].includes('mutation addContentToDocFromMarkdown'));
      expect(addContentCall).toBeUndefined();
    });

    it('should return error when object_id resolution returns docs as null', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getDocByObjectId')) {
          return Promise.resolve({ docs: null });
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        object_id: 'obj_null_docs',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error: No document found for object_id obj_null_docs');
    });

    it('should handle exception during object_id resolution', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getDocByObjectId')) {
          return Promise.reject(new Error('Resolution service unavailable'));
        }
        return Promise.resolve({});
      });

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        object_id: 'obj_789',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error adding content to document');
      expect(result.content[0].text).toContain('Resolution service unavailable');
    });

    it('should return error when neither doc_id nor object_id is provided', async () => {
      const result = await callToolByNameRawAsync('add_content_to_doc', {
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error: Either doc_id or object_id must be provided');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should return schema error when markdown is missing', async () => {
      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
      });

      expect(result.content[0].text).toContain('Failed to execute tool add_content_to_doc: Invalid arguments');
      expect(result.content[0].text).toContain('markdown');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle GraphQL request exception', async () => {
      const errorMessage = 'Network error: Connection timeout';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('add_content_to_doc', {
        doc_id: 'doc_123',
        markdown: 'Content',
      });

      expect(result.content[0].text).toContain('Error adding content to document');
      expect(result.content[0].text).toContain(errorMessage);
    });
  });
});
