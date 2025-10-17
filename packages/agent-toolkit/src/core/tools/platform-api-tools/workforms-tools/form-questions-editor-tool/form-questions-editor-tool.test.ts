import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { formQuestionsEditorToolSchema } from './schema';
import { FormQuestionActions } from '../workforms.types';
import {
  FormQuestionType,
  FormQuestionPrefillSources,
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
} from 'src/monday-graphql/generated/graphql';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof formQuestionsEditorToolSchema, ZodTypeAny>;

describe('FormQuestionsEditorTool', () => {
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

  describe('Create Action', () => {
    describe('Success Cases', () => {
      it('should create a question with all required fields', async () => {
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
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'What is your name?',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_123');
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
          action: FormQuestionActions.Create,
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

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_456');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
        
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
            options: [
              { label: 'Red' },
              { label: 'Blue' },
              { label: 'Green' },
            ],
            settings: {
              display: 'Dropdown',
              optionsOrder: 'Custom',
            },
          },
        };

        mocks.setResponse(createQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.SingleSelect,
            title: 'Choose your favorite color',
            options: [
              { label: 'Red' },
              { label: 'Blue' },
              { label: 'Green' },
            ],
            settings: {
              display: FormQuestionSelectDisplay.Dropdown,
              optionsOrder: FormQuestionSelectOrderByOptions.Custom,
            },
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_789');
        
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
          action: FormQuestionActions.Create,
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

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_date');
        
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
              prefixPredefined: {
                enabled: true,
                prefix: 'US',
              },
            },
          },
        };

        mocks.setResponse(createQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.Phone,
            title: 'Phone Number',
            settings: {
              prefixAutofilled: false,
              prefixPredefined: {
                enabled: true,
                prefix: 'US',
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_phone');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question.settings.prefixPredefined.enabled).toBe(true);
        expect(mockCall[1].question.settings.prefixPredefined.prefix).toBe('US');
      });

      it('should handle questionStringified parameter for Microsoft Copilot', async () => {
        const createQuestionResponse = {
          create_form_question: {
            id: 'question_stringified',
            type: FormQuestionType.ShortText,
            title: 'Test Question',
            description: null,
            visible: true,
            required: false,
            options: null,
            settings: null,
          },
        };

        mocks.setResponse(createQuestionResponse);

        const questionObject = {
          type: FormQuestionType.ShortText,
          title: 'Test Question',
        };

        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          questionStringified: JSON.stringify(questionObject),
          // question is omitted, fallback will use questionStringified
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: question_stringified');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question).toEqual(questionObject);
      });
    });

    describe('Validation Errors', () => {
      it('should return error when question is missing', async () => {
        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          // question is missing
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Must provide a full question payload when creating a question.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when title is missing from question', async () => {
        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.ShortText,
            // title is missing
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Must provide a title for the question when creating a question.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should handle missing formToken via schema validation', async () => {
        const args: Partial<inputType> = {
          action: FormQuestionActions.Create,
          // formToken is missing
          question: {
            type: FormQuestionType.ShortText,
            title: 'Test',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor: Invalid arguments');
        expect(result.content[0].text).toContain('formToken');
        expect(result.content[0].text).toContain('Required');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should handle missing action via schema validation', async () => {
        const args: Partial<inputType> = {
          // action is missing
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'Test',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor: Invalid arguments');
        expect(result.content[0].text).toContain('action');
        expect(result.content[0].text).toContain('Required');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'Test Question',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor');
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle GraphQL mutation failure', async () => {
        const createQuestionResponse = {
          create_form_question: null,
        };

        mocks.setResponse(createQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Create,
          formToken: 'form_token_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'Test Question',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question created successfully. ID: undefined');
      });
    });
  });

  describe('Update Action', () => {
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
          action: FormQuestionActions.Update,
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

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_123 updated successfully.');
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
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_456',
          question: {
            type: FormQuestionType.Email,
            description: 'Updated description only',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_456 updated successfully.');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question).toEqual({
          type: FormQuestionType.Email,
          description: 'Updated description only',
        });
      });

      it('should update question settings only', async () => {
        const updateQuestionResponse = {
          update_form_question: {
            id: 'question_789',
            type: FormQuestionType.Date,
            title: 'Date',
            description: null,
            visible: true,
            required: false,
            options: null,
            settings: {
              defaultCurrentDate: false,
              includeTime: false,
            },
          },
        };

        mocks.setResponse(updateQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_789',
          question: {
            type: FormQuestionType.Date,
            settings: {
              defaultCurrentDate: false,
              includeTime: false,
            },
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_789 updated successfully.');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question.settings).toEqual({
          defaultCurrentDate: false,
          includeTime: false,
        });
      });

      it('should update visibility and required flags', async () => {
        const updateQuestionResponse = {
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
        };

        mocks.setResponse(updateQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_visible',
          question: {
            type: FormQuestionType.ShortText,
            visible: false,
            required: true,
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_visible updated successfully.');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question.visible).toBe(false);
        expect(mockCall[1].question.required).toBe(true);
      });

      it('should handle questionStringified parameter for Microsoft Copilot', async () => {
        const updateQuestionResponse = {
          update_form_question: {
            id: 'question_stringified',
            type: FormQuestionType.ShortText,
            title: 'Stringified Update',
            description: null,
            visible: true,
            required: false,
            options: null,
            settings: null,
          },
        };

        mocks.setResponse(updateQuestionResponse);

        const questionObject = {
          type: FormQuestionType.ShortText,
          title: 'Stringified Update',
        };

        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_stringified',
          questionStringified: JSON.stringify(questionObject),
          // question is omitted, fallback will use questionStringified
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_stringified updated successfully.');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].question).toEqual(questionObject);
      });
    });

    describe('Validation Errors', () => {
      it('should return error when questionId is missing', async () => {
        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          // questionId is missing
          question: {
            type: FormQuestionType.ShortText,
            title: 'Test',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Question ID is required when updating a question.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when question is missing', async () => {
        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_123',
          // question is missing
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Must provide updated patch props for the question when updating.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'Updated',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor');
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle GraphQL mutation returning null', async () => {
        const updateQuestionResponse = {
          update_form_question: null,
        };

        mocks.setResponse(updateQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Update,
          formToken: 'form_token_123',
          questionId: 'question_123',
          question: {
            type: FormQuestionType.ShortText,
            title: 'Updated',
          },
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        // The tool should still return success even if the mutation returns null
        expect(result.content[0].text).toBe('Form question with id question_123 updated successfully.');
      });
    });
  });

  describe('Delete Action', () => {
    describe('Success Cases', () => {
      it('should delete a question successfully', async () => {
        const deleteQuestionResponse = {
          delete_question: true,
        };

        mocks.setResponse(deleteQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_123',
          questionId: 'question_to_delete',
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id question_to_delete deleted successfully.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation deleteFormQuestion');
        expect(mockCall[1]).toEqual({
          formToken: 'form_token_123',
          questionId: 'question_to_delete',
        });
      });

      it('should delete a question with different questionId', async () => {
        const deleteQuestionResponse = {
          delete_question: true,
        };

        mocks.setResponse(deleteQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_456',
          questionId: 'another_question_id',
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Form question with id another_question_id deleted successfully.');
        
        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].questionId).toBe('another_question_id');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when questionId is missing', async () => {
        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_123',
          // questionId is missing
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toBe('Question ID is required when deleting a question.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_123',
          questionId: 'question_to_delete',
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor');
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle permission denied error', async () => {
        const errorMessage = 'Permission denied: You do not have access to delete this question';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_123',
          questionId: 'question_restricted',
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor');
        expect(result.content[0].text).toContain('Permission denied');
      });

      it('should handle GraphQL mutation returning false', async () => {
        const deleteQuestionResponse = {
          delete_question: false,
        };

        mocks.setResponse(deleteQuestionResponse);

        const args: inputType = {
          action: FormQuestionActions.Delete,
          formToken: 'form_token_123',
          questionId: 'question_to_delete',
        };

        const result = await callToolByNameRawAsync('form_questions_editor', args);

        // The tool should still return success even if the mutation returns false
        expect(result.content[0].text).toBe('Form question with id question_to_delete deleted successfully.');
      });
    });
  });

  describe('Unknown Action', () => {
    it('should return error for unknown action', async () => {
      const args: Omit<inputType, 'action'> & { action: string } = {
        action: 'unknown_action',
        formToken: 'form_token_123',
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Different Question Types', () => {
    it('should create a multi-select question', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_multi',
          type: FormQuestionType.MultiSelect,
          title: 'Select multiple options',
          description: null,
          visible: true,
          required: false,
          options: [
            { label: 'Option 1' },
            { label: 'Option 2' },
            { label: 'Option 3' },
          ],
          settings: {
            display: FormQuestionSelectDisplay.Vertical,
            optionsOrder: FormQuestionSelectOrderByOptions.Alphabetical,
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.MultiSelect,
          title: 'Select multiple options',
          options: [
            { label: 'Option 1' },
            { label: 'Option 2' },
            { label: 'Option 3' },
          ],
          settings: {
            display: FormQuestionSelectDisplay.Vertical,
            optionsOrder: FormQuestionSelectOrderByOptions.Alphabetical,
          },
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_multi');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.MultiSelect);
      expect(mockCall[1].question.options).toHaveLength(3);
    });

    it('should create a boolean question with checkedByDefault', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_bool',
          type: FormQuestionType.Boolean,
          title: 'Agree to terms',
          description: null,
          visible: true,
          required: true,
          options: null,
          settings: {
            checkedByDefault: true,
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Boolean,
          title: 'Agree to terms',
          required: true,
          settings: {
            checkedByDefault: true,
          },
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_bool');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.Boolean);
      expect(mockCall[1].question.settings.checkedByDefault).toBe(true);
    });

    it('should create a location question with autofill', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_location',
          type: FormQuestionType.Location,
          title: 'Your location',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: {
            locationAutofilled: true,
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Location,
          title: 'Your location',
          settings: {
            locationAutofilled: true,
          },
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_location');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.Location);
      expect(mockCall[1].question.settings.locationAutofilled).toBe(true);
    });

    it('should create a link question with skipValidation', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_link',
          type: FormQuestionType.Link,
          title: 'Website URL',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: {
            skipValidation: true,
          },
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Link,
          title: 'Website URL',
          settings: {
            skipValidation: true,
          },
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_link');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.Link);
      expect(mockCall[1].question.settings.skipValidation).toBe(true);
    });

    it('should create a long text question', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_longtext',
          type: FormQuestionType.LongText,
          title: 'Tell us more',
          description: 'Provide detailed information',
          visible: true,
          required: true,
          options: null,
          settings: null,
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.LongText,
          title: 'Tell us more',
          description: 'Provide detailed information',
          required: true,
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_longtext');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.LongText);
    });

    it('should create a number question', async () => {
      const createQuestionResponse = {
        create_form_question: {
          id: 'question_number',
          type: FormQuestionType.Number,
          title: 'Enter a number',
          description: null,
          visible: true,
          required: false,
          options: null,
          settings: null,
        },
      };

      mocks.setResponse(createQuestionResponse);

      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.Number,
          title: 'Enter a number',
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      expect(result.content[0].text).toBe('Form question created successfully. ID: question_number');
      
      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1].question.type).toBe(FormQuestionType.Number);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string questionId', async () => {
      const args: inputType = {
        action: FormQuestionActions.Delete,
        formToken: 'form_token_123',
        questionId: '',
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      // Empty string is considered falsy, so it should trigger validation error
      expect(result.content[0].text).toBe('Question ID is required when deleting a question.');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle empty string formToken via schema validation', async () => {
      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: '',
        question: {
          type: FormQuestionType.ShortText,
          title: 'Test',
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      // Empty string passes schema validation (it's a string), but fails at API level
      expect(result.content[0].text).toContain('Failed to execute tool form_questions_editor');
      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });

    it('should handle question with empty title', async () => {
      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: '',
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      // Empty title is still considered present but invalid at API level
      expect(result.content[0].text).toBe('Must provide a title for the question when creating a question.');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only title', async () => {
      const args: inputType = {
        action: FormQuestionActions.Create,
        formToken: 'form_token_123',
        question: {
          type: FormQuestionType.ShortText,
          title: '   ',
        },
      };

      const result = await callToolByNameRawAsync('form_questions_editor', args);

      // Whitespace-only is considered present, validation happens at API
      expect(result.content[0].text).not.toBe('Must provide a title for the question when creating a question.');
      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });
  });
});

