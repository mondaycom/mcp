import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { deleteFormQuestionToolSchema } from './schema';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof deleteFormQuestionToolSchema, ZodTypeAny>;

describe('DeleteFormQuestionTool', () => {
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

  describe('Success Cases', () => {
    it('should delete a question successfully', async () => {
      mocks.setResponse({ delete_question: true });

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_to_delete',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question deleted', question_id: 'question_to_delete', action_name: 'delete' }),
      );
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('mutation deleteFormQuestion');
      expect(mockCall[1]).toEqual({
        formToken: 'form_token_123',
        questionId: 'question_to_delete',
      });
    });

    it('should delete a question with different IDs', async () => {
      mocks.setResponse({ delete_question: true });

      const args: inputType = {
        formToken: 'form_token_456',
        questionId: 'another_question_id',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question deleted', question_id: 'another_question_id', action_name: 'delete' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].questionId).toBe('another_question_id');
    });

    it('should handle mutation returning false', async () => {
      mocks.setResponse({ delete_question: false });

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_to_delete',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question deleted', question_id: 'question_to_delete', action_name: 'delete' }),
      );
    });
  });

  describe('Validation Errors', () => {
    it('should handle missing formToken via schema validation', async () => {
      const args: Partial<inputType> = {
        questionId: 'question_123',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool delete_form_question: Invalid arguments');
      expect(result.content[0].text).toContain('formToken');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle missing questionId via schema validation', async () => {
      const args: Partial<inputType> = {
        formToken: 'form_token_123',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool delete_form_question: Invalid arguments');
      expect(result.content[0].text).toContain('questionId');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('GraphQL Errors', () => {
    it('should handle GraphQL request exception', async () => {
      const errorMessage = 'Network error: Connection timeout';
      mocks.setError(errorMessage);

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_to_delete',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool delete_form_question');
      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should handle permission denied error', async () => {
      const errorMessage = 'Permission denied: You do not have access to delete this question';
      mocks.setError(errorMessage);

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_restricted',
      };

      const result = await callToolByNameRawAsync('delete_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool delete_form_question');
      expect(result.content[0].text).toContain('Permission denied');
    });
  });
});
