import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { createFormQuestionToolSchema } from './schema';
import {
  FormQuestionType,
  FormQuestionPrefillSources,
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
} from 'src/monday-graphql/generated/graphql/graphql';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof createFormQuestionToolSchema, ZodTypeAny>;

describe('CreateFormQuestionTool', () => {
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
    it('should create a question with required fields only', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_123',
          type: FormQuestionType.ShortText,
          title: 'What is your name?',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: null,
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: 'What is your name?',
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question created', question_id: 'question_123', action_name: 'create' }),
      );
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('mutation createFormQuestion');
      expect(mockCall[1]).toEqual({
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: 'What is your name?',
        },
      });
    });

    it('should create a question with all optional fields', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_456',
          type: FormQuestionType.Email,
          title: 'Email Address',
          description: 'Please provide your email',
          visible: true,
          required: true,
          options: null,
          settings: {
            prefill: {
              enabled: true,
              source: 'Account',
              lookup: 'email',
            },
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Email,
          title: 'Email Address',
          description: 'Please provide your email',
          visible: true,
          required: true,
          settings: {
            prefill: {
              enabled: true,
              source: FormQuestionPrefillSources.Account,
              lookup: 'email',
            },
          },
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question created', question_id: 'question_456', action_name: 'create' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question).toEqual({
        type: FormQuestionType.Email,
        title: 'Email Address',
        description: 'Please provide your email',
        visible: true,
        required: true,
        settings: {
          prefill: {
            enabled: true,
            source: FormQuestionPrefillSources.Account,
            lookup: 'email',
          },
        },
      });
    });

    it('should create a single select question with options', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_789',
          type: FormQuestionType.SingleSelect,
          title: 'Choose your favorite color',
          description: null,
          visible: true,
          required: false,
          options: [{ label: 'Red' }, { label: 'Blue' }, { label: 'Green' }],
          settings: {
            display: 'Dropdown',
            optionsOrder: 'Custom',
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.SingleSelect,
          title: 'Choose your favorite color',
          options: [{ label: 'Red' }, { label: 'Blue' }, { label: 'Green' }],
          settings: {
            display: FormQuestionSelectDisplay.Dropdown,
            optionsOrder: FormQuestionSelectOrderByOptions.Custom,
          },
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question created', question_id: 'question_789', action_name: 'create' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.options).toHaveLength(3);
      expect(mockCall[1].question.options[0].label).toBe('Red');
    });

    it('should create a date question with settings', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_date',
          type: FormQuestionType.Date,
          title: 'Select a date',
          description: null,
          visible: true,
          required: true,
          options: null,
          settings: {
            defaultCurrentDate: true,
            includeTime: true,
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Date,
          title: 'Select a date',
          required: true,
          settings: {
            defaultCurrentDate: true,
            includeTime: true,
          },
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question created', question_id: 'question_date', action_name: 'create' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.settings.defaultCurrentDate).toBe(true);
      expect(mockCall[1].question.settings.includeTime).toBe(true);
    });

    it('should create a phone question with prefix settings', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_phone',
          type: FormQuestionType.Phone,
          title: 'Phone Number',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: {
            prefixAutofilled: false,
            prefixPredefined: { enabled: true, prefix: 'US' },
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Phone,
          title: 'Phone Number',
          settings: {
            prefixAutofilled: false,
            prefixPredefined: { enabled: true, prefix: 'US' },
          },
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(
        JSON.stringify({ message: 'Question created', question_id: 'question_phone', action_name: 'create' }),
      );

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.settings.prefixPredefined.enabled).toBe(true);
      expect(mockCall[1].question.settings.prefixPredefined.prefix).toBe('US');
    });

    it('should handle mutation returning null question ID', async () => {
      mocks.setResponse({ create_form_question: null });

      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: 'Test Question',
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe(JSON.stringify({ message: 'Question created', action_name: 'create' }));
    });
  });

  describe('Validation Errors', () => {
    it('should return error when title is empty string', async () => {
      const args: inputType = {
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: '',
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toBe('Must provide a title for the question when creating a question.');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle missing formToken via schema validation', async () => {
      const args: Partial<inputType> = {
        question: {
          type: FormQuestionType.ShortText,
          title: 'Test',
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool create_form_question: Invalid arguments');
      expect(result.content[0].text).toContain('formToken');
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
        question: {
          type: FormQuestionType.ShortText,
          title: 'Test Question',
        },
      };

      const result = await callToolByNameRawAsync('create_form_question', args);

      expect(result.content[0].text).toContain('Failed to execute tool create_form_question');
      expect(result.content[0].text).toContain(errorMessage);
    });
  });
});
