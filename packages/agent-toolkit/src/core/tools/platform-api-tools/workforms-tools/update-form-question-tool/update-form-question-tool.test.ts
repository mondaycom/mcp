import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { updateFormQuestionToolSchema } from './schema';
import { FormQuestionType } from 'src/monday-graphql/generated/graphql/graphql';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof updateFormQuestionToolSchema, ZodTypeAny>;

describe('UpdateFormQuestionTool', () => {
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
    it('should update a question with all fields', async () => {
      const updateQuestionResponse = {
        update_form_question: {
          id: 'question_123',
          type: FormQuestionType.ShortText,
          title: 'Updated Title',
          description: 'Updated Description',
          visible: false,
          required: true,
          options: null,
          settings: null,
        },
      };

      mocks.setResponse(updateQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_123',
        question: {
          type: FormQuestionType.ShortText,
          title: 'Updated Title',
          description: 'Updated Description',
          visible: false,
          required: true,
        },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question updated', question_id: 'question_123', action_name: 'update' }),
      );
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('mutation updateFormQuestion');
      expect(mockCall[1]).toEqual({
        formToken: 'form_token_123',
        questionId: 'question_123',
        question: {
          type: FormQuestionType.ShortText,
          title: 'Updated Title',
          description: 'Updated Description',
          visible: false,
          required: true,
        },
      });
    });

    it('should update a question with partial fields (patch)', async () => {
      const updateQuestionResponse = {
        update_form_question: {
          id: 'question_456',
          type: FormQuestionType.Email,
          title: 'Email',
          description: 'Updated description only',
          visible: true,
          required: false,
          options: null,
          settings: null,
        },
      };

      mocks.setResponse(updateQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_456',
        question: {
          description: 'Updated description only',
        },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question updated', question_id: 'question_456', action_name: 'update' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question).toEqual({
        description: 'Updated description only',
      });
    });

    it('should update question settings only', async () => {
      mocks.setResponse({
        update_form_question: {
          id: 'question_789',
          type: FormQuestionType.Date,
          title: 'Date',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: { defaultCurrentDate: false, includeTime: false },
        },
      });

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_789',
        question: {
          settings: {
            defaultCurrentDate: false,
            includeTime: false,
          },
        },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question updated', question_id: 'question_789', action_name: 'update' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.settings).toEqual({
        defaultCurrentDate: false,
        includeTime: false,
      });
    });

    it('should update visibility and required flags', async () => {
      mocks.setResponse({
        update_form_question: {
          id: 'question_visible',
          type: FormQuestionType.ShortText,
          title: 'Test',
          description: null,
          visible: false,
          required: true,
          options: null,
          settings: null,
        },
      });

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_visible',
        question: {
          visible: false,
          required: true,
        },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question updated', question_id: 'question_visible', action_name: 'update' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.visible).toBe(false);
      expect(mockCall[1].question.required).toBe(true);
    });

    it('should handle mutation returning null', async () => {
      mocks.setResponse({ update_form_question: null });

      const args: inputType = {
        formToken: 'form_token_123',
        questionId: 'question_123',
        question: { title: 'Updated' },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question updated', question_id: 'question_123', action_name: 'update' }),
      );
    });
  });

  describe('Validation Errors', () => {
    it('should handle missing questionId via schema validation', async () => {
      const args: Partial<inputType> = {
        formToken: 'form_token_123',
        question: { title: 'Test' },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form_question: Invalid arguments');
      expect(result.content[0].text).toContain('questionId');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle missing question via schema validation', async () => {
      const args: Partial<inputType> = {
        formToken: 'form_token_123',
        questionId: 'question_123',
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form_question: Invalid arguments');
      expect(result.content[0].text).toContain('question');
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
        questionId: 'question_123',
        question: { title: 'Updated' },
      };

      const result = await callToolByNameRawAsync('update_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form_question');
      expect(result.content[0].text).toContain(errorMessage);
    });
  });
});
