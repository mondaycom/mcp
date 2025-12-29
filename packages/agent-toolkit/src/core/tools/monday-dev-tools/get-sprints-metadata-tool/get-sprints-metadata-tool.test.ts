import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../platform-api-tools/test-utils/mock-api-client';
import { GetSprintsMetadataTool, getSprintsMetadataToolSchema } from './get-sprints-metadata-tool';
import { z } from 'zod';
import { ERROR_PREFIXES } from '../shared';
import {
  VALID_SPRINTS_BOARD_SCHEMA,
  REALISTIC_SPRINTS_RESPONSE,
  EMPTY_SPRINTS_RESPONSE,
  INVALID_BOARD_SCHEMA,
  NO_BOARD_FOUND_RESPONSE,
  SPRINTS_WITH_MISSING_TIMELINE,
  MALFORMED_BOARD_RESPONSE,
  EXPECTED_SPRINTS_REPORT_OUTPUT,
} from './get-sprints-metadata-tool-test-data';

export type InputType = Partial<z.infer<z.ZodObject<typeof getSprintsMetadataToolSchema>>> & { sprintsBoardId: number };

describe('GetSprintsMetadataTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const validBoardSchemaResponse = VALID_SPRINTS_BOARD_SCHEMA;
  const successfulSprintsResponse = REALISTIC_SPRINTS_RESPONSE;
  const emptySprintsResponse = EMPTY_SPRINTS_RESPONSE;
  const expectedSprintsReportOutput = EXPECTED_SPRINTS_REPORT_OUTPUT;

  describe('Basic Functionality', () => {
    it('should successfully get sprints metadata with default limit', async () => {
      mocks
        .getMockRequest()
        .mockResolvedValueOnce(validBoardSchemaResponse)
        .mockResolvedValueOnce(successfulSprintsResponse);

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(expectedSprintsReportOutput);

      const calls = mocks.getMockRequest().mock.calls;
      const schemaCall = calls.find((call) => call[0].includes('query getBoardSchema'));
      const itemsCall = calls.find((call) => call[0].includes('query GetSprintsBoardItemsWithColumns'));

      expect(schemaCall).toBeDefined();
      expect(schemaCall[1]).toEqual({ boardId: '123456789' });

      expect(itemsCall).toBeDefined();
      expect(itemsCall[1]).toEqual({ boardId: '123456789', limit: 25 });
    });

    it('should successfully get sprints metadata with custom limit', async () => {
      mocks
        .getMockRequest()
        .mockResolvedValueOnce(validBoardSchemaResponse)
        .mockResolvedValueOnce(successfulSprintsResponse);

      const args: InputType = { sprintsBoardId: 123456789, limit: 50 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);
      
      expect(result.content[0].text).toContain(expectedSprintsReportOutput);


      const calls = mocks.getMockRequest().mock.calls;
      const itemsCall = calls.find((call) => call[0].includes('query GetSprintsBoardItemsWithColumns'));

      expect(itemsCall).toBeDefined();
      expect(itemsCall[1]).toEqual({ boardId: '123456789', limit: 50 });
    });

  });

  describe('Schema Validation', () => {
    it('should fail when board is not found', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(NO_BOARD_FOUND_RESPONSE);
      });

      const args: InputType = { sprintsBoardId: 999999999 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.BOARD_NOT_FOUND);
      expect(result.content[0].text).toContain('999999999');
    });

    it('should fail when board is missing required sprint columns', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(INVALID_BOARD_SCHEMA);
      });

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.VALIDATION_ERROR);
      expect(result.content[0].text).toContain('not a valid sprints board');
      expect(result.content[0].text).toContain('Missing required columns');
    });
  });

  it('should have correct tool metadata', () => {
    const tool = new GetSprintsMetadataTool(mocks.mockApiClient, 'fake_token');

    expect(tool.name).toBe('get_sprints_metadata');
    expect(tool.type).toBe('read');
    expect(tool.annotations.title).toBe('monday-dev: Get Sprints Metadata');
    expect(tool.annotations.readOnlyHint).toBe(true);
    expect(tool.annotations.destructiveHint).toBe(false);
    expect(tool.annotations.idempotentHint).toBe(true);
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty sprints list', async () => {
      mocks
        .getMockRequest()
        .mockResolvedValueOnce(validBoardSchemaResponse)
        .mockResolvedValueOnce(emptySprintsResponse);

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain('# Sprints Metadata Report');
      expect(result.content[0].text).toContain('**Total Sprints:** 0');
    });

    it('should handle sprints with missing timeline', async () => {
      mocks
        .getMockRequest()
        .mockResolvedValueOnce(validBoardSchemaResponse)
        .mockResolvedValueOnce(SPRINTS_WITH_MISSING_TIMELINE);

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      const content = result.content[0].text;
      expect(content).toContain('Not set');
      expect(content).toContain('Not started');
      expect(content).toContain('Not ended');
    });

    it('should handle malformed board response', async () => {
      jest.spyOn(mocks, 'mockRequest').mockImplementation(() => {
        return Promise.resolve(MALFORMED_BOARD_RESPONSE);
      });

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.VALIDATION_ERROR);
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors during schema validation', async () => {
      const errorMessage = 'GraphQL schema error occurred';
      mocks.setError(errorMessage);

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.INTERNAL_ERROR);
      expect(result.content[0].text).toContain('Error validating board schema');
    });

    it('should handle GraphQL errors during items fetch', async () => {
      mocks
        .getMockRequest()
        .mockResolvedValueOnce(validBoardSchemaResponse)
        .mockRejectedValueOnce(new Error('Failed to fetch sprint items'));

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.INTERNAL_ERROR);
      expect(result.content[0].text).toContain('Error retrieving sprints metadata');
    });

    it('should handle network errors gracefully', async () => {
      mocks.setError(new Error('Network connection failed'));

      const args: InputType = { sprintsBoardId: 123456789 };
      const result = await callToolByNameRawAsync('get_sprints_metadata', args);

      expect(result.content[0].text).toContain(ERROR_PREFIXES.INTERNAL_ERROR);
    });
  });

});
