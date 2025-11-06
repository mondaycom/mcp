import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../platform-api-tools/test-utils/mock-api-client';
import { GetSprintSummaryTool, getSprintSummaryToolSchema } from './get-sprint-summary-tool';
import { z } from 'zod';
import { ERROR_PREFIXES } from '../shared';
import {
  VALID_SPRINT_WITH_SUMMARY,
  VALID_DOC_RESPONSE,
  REALISTIC_SPRINT_SUMMARY_MARKDOWN,
  SPRINT_NOT_FOUND_RESPONSE,
  SPRINT_WITHOUT_SUMMARY,
  SPRINT_WITH_NULL_DOC_OBJECT_ID,
  EMPTY_DOC_RESPONSE,
  INVALID_DOC_RESPONSE,
  NULL_DOC_IN_ARRAY_RESPONSE,
  FAILED_MARKDOWN_EXPORT,
  EMPTY_MARKDOWN_EXPORT,
  EMPTY_STRING_MARKDOWN_EXPORT,
  SPRINT_MISSING_COLUMNS,
} from './get-sprint-summary-tool-test-data';

export type InputType = z.infer<z.ZodObject<typeof getSprintSummaryToolSchema>>;

describe('GetSprintSummaryTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const validSprintResponse = VALID_SPRINT_WITH_SUMMARY;
  const sprintWithoutSummaryResponse = SPRINT_WITHOUT_SUMMARY;
  const validDocResponse = VALID_DOC_RESPONSE;
  const validMarkdownExportResponse = REALISTIC_SPRINT_SUMMARY_MARKDOWN;

  describe('Basic Functionality', () => {
    it('should successfully retrieve sprint summary', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(validDocResponse);
        } else if (query.includes('query exportMarkdownFromDoc')) {
          return Promise.resolve(validMarkdownExportResponse);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);
      const content = result.content[0].text;

      expect(content).toContain(validMarkdownExportResponse.export_markdown_from_doc!.markdown);
  

      const calls = mocks.getMockRequest().mock.calls;

      const sprintCall = calls.find((call) => call[0].includes('query getSprintsByIds'));
      expect(sprintCall).toBeDefined();
      expect(sprintCall[1]).toEqual({ ids: ['1004'] });

      const docCall = calls.find((call) => call[0].includes('query readDocs'));
      expect(docCall).toBeDefined();
      expect(docCall[1]).toEqual({ object_ids: ['doc_obj_summary_1004'], limit: 1 });

      const exportCall = calls.find((call) => call[0].includes('query exportMarkdownFromDoc'));
      expect(exportCall).toBeDefined();
      expect(exportCall[1]).toEqual({ docId: 'doc_internal_1004', blockIds: [] });
    });

    it('should have correct tool metadata', () => {
      const tool = new GetSprintSummaryTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_sprint_summary');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('monday-dev: Get Sprint Summary');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });

  describe('Sprint Not Found', () => {
    it('should return error when sprint does not exist', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(SPRINT_NOT_FOUND_RESPONSE);
      });

      const args: InputType = { sprintId: 999999 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.SPRINT_NOT_FOUND);
      expect(result.content[0].text).toContain('999999');
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Missing Sprint Summary Document', () => {
    it('should return error when active sprint has no summary document', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(sprintWithoutSummaryResponse);
      });

      const args: InputType = { sprintId: 222 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_NOT_FOUND);
      expect(result.content[0].text).toContain('No sprint summary document found');
      expect(result.content[0].text).toContain('Sprint 23 - Active');
    });

    it('should return error when document object_id is null', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(SPRINT_WITH_NULL_DOC_OBJECT_ID);
      });

      const args: InputType = { sprintId: 333 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_NOT_FOUND);
      expect(result.content[0].text).toContain('No sprint summary document found');
    });
  });

  describe('Missing Required Columns', () => {
    it('should return error when sprint is missing required columns', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(SPRINT_MISSING_COLUMNS);
      });

      const args: InputType = { sprintId: 444 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.VALIDATION_ERROR);
      expect(result.content[0].text).toContain('missing required columns');
    });
  });

  describe('Document Read Errors', () => {
    it('should return error when document is not found', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(EMPTY_DOC_RESPONSE);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_NOT_FOUND);
      expect(result.content[0].text).toContain('doc_obj_summary_1004');
      expect(result.content[0].text).toContain('not found or not accessible');
    });

    it('should return error when document data is invalid', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(NULL_DOC_IN_ARRAY_RESPONSE);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_INVALID);
    });

    it('should return error when document has no id', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(INVALID_DOC_RESPONSE);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.EXPORT_FAILED);
      expect(result.content[0].text).toContain('Failed to export markdown');
    });

    it('should return error when markdown export fails', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(validDocResponse);
        } else if (query.includes('query exportMarkdownFromDoc')) {
          return Promise.resolve(FAILED_MARKDOWN_EXPORT);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.EXPORT_FAILED);
      expect(result.content[0].text).toContain('Failed to export markdown');
      expect(result.content[0].text).toContain('document corruption');
    });

    it('should return error when markdown content is empty', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(validDocResponse);
        } else if (query.includes('query exportMarkdownFromDoc')) {
          return Promise.resolve(EMPTY_MARKDOWN_EXPORT);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_EMPTY);
      expect(result.content[0].text).toContain('Document content is empty');
    });

    it('should return error when markdown is empty string', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          return Promise.resolve(validDocResponse);
        } else if (query.includes('query exportMarkdownFromDoc')) {
          return Promise.resolve(EMPTY_STRING_MARKDOWN_EXPORT);
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.DOCUMENT_EMPTY);
    });
  });

  describe('GraphQL Errors', () => {
    it('should handle GraphQL errors during sprint item fetch', async () => {
      const errorMessage = 'GraphQL error during sprint fetch';
      mocks.setError(errorMessage);

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.INTERNAL_ERROR);
      expect(result.content[0].text).toContain('Error getting sprint item');
    });

    it('should handle unknown GraphQL errors during document read', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation((query: string) => {
        if (query.includes('query getSprintsByIds')) {
          return Promise.resolve(validSprintResponse);
        } else if (query.includes('query readDocs')) {
          throw new Error('Failed to read document');
        }
        return Promise.resolve({});
      });

      const args: InputType = { sprintId: 1004 };
      const result = await callToolByNameRawAsync('get_sprint_summary', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.INTERNAL_ERROR);
      expect(result.content[0].text).toContain('Error reading document');
    });
  });
});
