import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { updateFormToolSchema, FormActions } from './schema';
import { z, ZodTypeAny } from 'zod';
import {
  BackgroundType,
  Direction,
  Format,
  Alignment,
  LogoPosition,
  LogoSize,
  FontSize,
} from '../workforms.types';

export type inputType = z.objectInputType<typeof updateFormToolSchema, ZodTypeAny>;

describe('UpdateFormTool', () => {
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

  describe('Activate Action', () => {
    describe('Success Cases', () => {
      it('should activate a form successfully', async () => {
        const activateFormResponse = {
          activate_form: {
            id: 'form_123',
            token: 'token_123',
            active: true,
          },
        };

        mocks.setResponse(activateFormResponse);

        const args: inputType = {
          action: FormActions.activate,
          formToken: 'token_123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Form successfully activated.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation activateForm');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
        });
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Network error: Connection timeout';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.activate,
          formToken: 'token_123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Deactivate Action', () => {
    describe('Success Cases', () => {
      it('should deactivate a form successfully', async () => {
        const deactivateFormResponse = {
          deactivate_form: {
            id: 'form_123',
            token: 'token_123',
            active: false,
          },
        };

        mocks.setResponse(deactivateFormResponse);

        const args: inputType = {
          action: FormActions.deactivate,
          formToken: 'token_456',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Form successfully deactivated.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation deactivateForm');
        expect(mockCall[1]).toEqual({
          formToken: 'token_456',
        });
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Permission denied: You do not have access to deactivate this form';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.deactivate,
          formToken: 'token_123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain('Permission denied');
      });
    });
  });

  describe('Shorten Form URL Action', () => {
    describe('Success Cases', () => {
      it('should shorten form URL successfully', async () => {
        const shortenFormUrlResponse = {
          shorten_form_url: {
            url: 'https://forms.monday.com/abc',
          },
        };

        mocks.setResponse(shortenFormUrlResponse);

        const args: inputType = {
          action: FormActions.shortenFormUrl,
          formToken: 'token_123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Form URL successfully shortened.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation shortenFormUrl');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
        });
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Unable to shorten URL';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.shortenFormUrl,
          formToken: 'token_123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Set Form Password Action', () => {
    describe('Success Cases', () => {
      it('should set form password successfully', async () => {
        const setFormPasswordResponse = {
          set_form_password: {
            password: {
              enabled: true,
            },
          },
        };

        mocks.setResponse(setFormPasswordResponse);

        const args: inputType = {
          action: FormActions.setFormPassword,
          formToken: 'token_123',
          formPassword: 'securePassword123',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Form password successfully set.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation setFormPassword');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          input: {
            password: 'securePassword123',
          },
        });
      });

      it('should update form password with a different password', async () => {
        const setFormPasswordResponse = {
          set_form_password: {
            password: {
              enabled: true,
            },
          },
        };

        mocks.setResponse(setFormPasswordResponse);

        const args: inputType = {
          action: FormActions.setFormPassword,
          formToken: 'token_456',
          formPassword: 'newPassword456',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Form password successfully set.');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].input.password).toBe('newPassword456');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when formPassword is missing', async () => {
        const args: inputType = {
          action: FormActions.setFormPassword,
          formToken: 'token_123',
          // formPassword is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'formPassword is required for the action "setFormPassword" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Password does not meet complexity requirements';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.setFormPassword,
          formToken: 'token_123',
          formPassword: 'weak',
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Create Tag Action', () => {
    describe('Success Cases', () => {
      it('should create a tag with name and value', async () => {
        const createTagResponse = {
          create_form_tag: {
            id: 'tag_123',
            name: 'utm_source',
            value: 'google',
            columnId: 'column_456',
          },
        };

        mocks.setResponse(createTagResponse);

        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          tag: {
            name: 'utm_source',
            value: 'google',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Tag successfully added:');
        expect(result.content[0].text).toContain('tag_123');
        expect(result.content[0].text).toContain('utm_source');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation createFormTag');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          tag: {
            name: 'utm_source',
            value: 'google',
          },
        });
      });

      it('should create a tag with name only (no value)', async () => {
        const createTagResponse = {
          create_form_tag: {
            id: 'tag_456',
            name: 'campaign',
            value: undefined,
            columnId: 'column_789',
          },
        };

        mocks.setResponse(createTagResponse);

        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          tag: {
            name: 'campaign',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Tag successfully added:');
        expect(result.content[0].text).toContain('campaign');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tag.name).toBe('campaign');
        expect(mockCall[1].tag.value).toBeUndefined();
      });

      it('should handle tagStringified parameter for Microsoft Copilot', async () => {
        const createTagResponse = {
          create_form_tag: {
            id: 'tag_stringified',
            name: 'utm_medium',
            value: 'email',
            columnId: 'column_999',
          },
        };

        mocks.setResponse(createTagResponse);

        const tagObject = {
          name: 'utm_medium',
          value: 'email',
        };

        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          tagStringified: JSON.stringify(tagObject),
          // tag is omitted, fallback will use tagStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Tag successfully added:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tag).toEqual(tagObject);
      });
    });

    describe('Validation Errors', () => {
      it('should return error when tag is missing', async () => {
        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          // tag is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag is required for the action "createTag" in the update form tool.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when tag name is missing', async () => {
        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          tag: {
            value: 'test_value',
            // name is missing
          }
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Tag name is required for the action "createTag" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Tag with this name already exists';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.createTag,
          formToken: 'token_123',
          tag: {
            name: 'existing_tag',
            value: 'value',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Delete Tag Action', () => {
    describe('Success Cases', () => {
      it('should delete a tag successfully', async () => {
        const deleteTagResponse = {
          delete_form_tag: true,
        };

        mocks.setResponse(deleteTagResponse);

        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_123',
          tag: {
            id: 'tag_to_delete',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: tag_to_delete successfully deleted.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation deleteFormTag');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          tagId: 'tag_to_delete',
        });
      });

      it('should delete a tag with different id', async () => {
        const deleteTagResponse = {
          delete_form_tag: true,
        };

        mocks.setResponse(deleteTagResponse);

        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_456',
          tag: {
            id: 'another_tag_id',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: another_tag_id successfully deleted.');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tagId).toBe('another_tag_id');
      });

      it('should handle tagStringified parameter for Microsoft Copilot', async () => {
        const deleteTagResponse = {
          delete_form_tag: true,
        };

        mocks.setResponse(deleteTagResponse);

        const tagObject = {
          id: 'tag_stringified',
        };

        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_123',
          tagStringified: JSON.stringify(tagObject),
          // tag is omitted, fallback will use tagStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: tag_stringified successfully deleted.');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tagId).toBe('tag_stringified');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when tag is missing', async () => {
        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_123',
          // tag is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag is required for the action "deleteTag" in the update form tool.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when tag id is missing', async () => {
        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_123',
          tag: {
            // id is missing
          }
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag id is required for the action "deleteTag" in the update form tool.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Tag not found';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.deleteTag,
          formToken: 'token_123',
          tag: {
            id: 'nonexistent_tag',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Update Tag Action', () => {
    describe('Success Cases', () => {
      it('should update a tag successfully', async () => {
        const updateTagResponse = {
          update_form_tag: {
            id: 'tag_123',
            name: 'utm_source',
            value: 'updated_value',
            columnId: 'column_456',
          },
        };

        mocks.setResponse(updateTagResponse);

        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tag: {
            id: 'tag_123',
            value: 'updated_value',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: tag_123 successfully updated to value: updated_value.');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormTag');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          tagId: 'tag_123',
          tag: {
            value: 'updated_value',
          },
        });
      });

      it('should update a tag with different value', async () => {
        const updateTagResponse = {
          update_form_tag: {
            id: 'tag_456',
            name: 'campaign',
            value: 'summer_2024',
            columnId: 'column_789',
          },
        };

        mocks.setResponse(updateTagResponse);

        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_456',
          tag: {
            id: 'tag_456',
            value: 'summer_2024',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: tag_456 successfully updated to value: summer_2024.');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tagId).toBe('tag_456');
        expect(mockCall[1].tag.value).toBe('summer_2024');
      });

      it('should handle tagStringified parameter for Microsoft Copilot', async () => {
        const updateTagResponse = {
          update_form_tag: {
            id: 'tag_stringified',
            name: 'utm_medium',
            value: 'copilot_value',
            columnId: 'column_999',
          },
        };

        mocks.setResponse(updateTagResponse);

        const tagObject = {
          id: 'tag_stringified',
          value: 'copilot_value',
        };

        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tagStringified: JSON.stringify(tagObject),
          // tag is omitted, fallback will use tagStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag with id: tag_stringified successfully updated to value: copilot_value.');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].tagId).toBe('tag_stringified');
        expect(mockCall[1].tag.value).toBe('copilot_value');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when tag is missing', async () => {
        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          // tag is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Tag is required for the action "updateTag" in the update form tool.');
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when tag id is missing', async () => {
        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tag: {
            value: 'test_value',
            // id is missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Tag id and value are required for the action "updateTag" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when tag value is missing', async () => {
        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tag: {
            id: 'tag_123',
            // value is missing
          }
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Tag id and value are required for the action "updateTag" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Tag not found';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tag: {
            id: 'nonexistent_tag',
            value: 'new_value',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });

      it('should handle GraphQL mutation returning null', async () => {
        const updateTagResponse = {
          update_form_tag: null,
        };

        mocks.setResponse(updateTagResponse);

        const args: inputType = {
          action: FormActions.updateTag,
          formToken: 'token_123',
          tag: {
            id: 'tag_123',
            value: 'new_value',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe('Unable to update tag with id: tag_123.');
      });
    });
  });

  describe('Update Appearance Action', () => {
    describe('Success Cases', () => {
      it('should update appearance with all fields', async () => {
        const updateAppearanceResponse = {
          update_form_settings: {
            appearance: {
              background: {
                type: BackgroundType.Color,
                value: '#ffffff',
              },
              hideBranding: true,
              layout: {
                format: Format.OneByOne,
                alignment: Alignment.Center,
                direction: Direction.LtR,
              },
              logo: {
                position: LogoPosition.Center,
                size: LogoSize.Medium,
              },
              primaryColor: '#007bff',
              showProgressBar: true,
              submitButton: {
                text: 'Submit Form',
              },
              text: {
                font: 'Arial',
                color: '#000000',
                size: FontSize.Medium,
              },
            },
          },
        };

        mocks.setResponse(updateAppearanceResponse);

        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          form: {
            appearance: {
              background: {
                type: BackgroundType.Color,
                value: '#ffffff',
              },
              hideBranding: true,
              layout: {
                format: Format.OneByOne,
                alignment: Alignment.Center,
                direction: Direction.LtR,
              },
              logo: {
                position: LogoPosition.Center,
                size: LogoSize.Medium,
              },
              primaryColor: '#007bff',
              showProgressBar: true,
              submitButton: {
                text: 'Submit Form',
              },
              text: {
                font: 'Arial',
                color: '#000000',
                size: FontSize.Medium,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Appearance successfully updated:');
        expect(result.content[0].text).toContain('#ffffff');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormAppearance');
        expect(mockCall[1].formToken).toBe('token_123');
        expect(mockCall[1].appearance.primaryColor).toBe('#007bff');
      });

      it('should update appearance with partial fields', async () => {
        const updateAppearanceResponse = {
          update_form_settings: {
            appearance: {
              primaryColor: '#ff0000',
              showProgressBar: false,
            },
          },
        };

        mocks.setResponse(updateAppearanceResponse);

        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_456',
          form: {
            appearance: {
              primaryColor: '#ff0000',
              showProgressBar: false,
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Appearance successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].appearance.primaryColor).toBe('#ff0000');
        expect(mockCall[1].appearance.showProgressBar).toBe(false);
      });

      it('should update appearance with image background', async () => {
        const updateAppearanceResponse = {
          update_form_settings: {
            appearance: {
              background: {
                type: BackgroundType.Image,
                value: 'https://example.com/image.jpg',
              },
            },
          },
        };

        mocks.setResponse(updateAppearanceResponse);

        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          form: {
            appearance: {
              background: {
                type: BackgroundType.Image,
                value: 'https://example.com/image.jpg',
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Appearance successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].appearance.background.type).toBe(BackgroundType.Image);
        expect(mockCall[1].appearance.background.value).toBe('https://example.com/image.jpg');
      });

      it('should handle formStringified parameter for Microsoft Copilot', async () => {
        const updateAppearanceResponse = {
          update_form_settings: {
            appearance: {
              primaryColor: '#00ff00',
            },
          },
        };

        mocks.setResponse(updateAppearanceResponse);

        const formObject = {
          appearance: {
            primaryColor: '#00ff00',
          },
        };

        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          formStringified: JSON.stringify(formObject),
          // form is omitted, fallback will use formStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Appearance successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].appearance.primaryColor).toBe('#00ff00');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when appearance is missing', async () => {
        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          form: {
            // appearance is missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Appearance is required for the action "updateAppearance" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when form is missing', async () => {
        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          // form is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Appearance is required for the action "updateAppearance" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Invalid color format';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateAppearance,
          formToken: 'token_123',
          form: {
            appearance: {
              primaryColor: 'invalid_color',
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Update Accessibility Action', () => {
    describe('Success Cases', () => {
      it('should update accessibility with all fields', async () => {
        const updateAccessibilityResponse = {
          update_form_settings: {
            accessibility: {
              language: 'en',
              logoAltText: 'Company Logo',
            },
          },
        };

        mocks.setResponse(updateAccessibilityResponse);

        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_123',
          form: {
            accessibility: {
              language: 'en',
              logoAltText: 'Company Logo',
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Accessibility successfully updated:');
        expect(result.content[0].text).toContain('Company Logo');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormAccessibility');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          accessibility: {
            language: 'en',
            logoAltText: 'Company Logo',
          },
        });
      });

      it('should update accessibility with language only', async () => {
        const updateAccessibilityResponse = {
          update_form_settings: {
            accessibility: {
              language: 'es',
            },
          },
        };

        mocks.setResponse(updateAccessibilityResponse);

        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_456',
          form: {
            accessibility: {
              language: 'es',
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Accessibility successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].accessibility.language).toBe('es');
      });

      it('should handle formStringified parameter for Microsoft Copilot', async () => {
        const updateAccessibilityResponse = {
          update_form_settings: {
            accessibility: {
              language: 'fr',
              logoAltText: 'Logo de la société',
            },
          },
        };

        mocks.setResponse(updateAccessibilityResponse);

        const formObject = {
          accessibility: {
            language: 'fr',
            logoAltText: 'Logo de la société',
          },
        };

        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_123',
          formStringified: JSON.stringify(formObject),
          // form is omitted, fallback will use formStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Accessibility successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].accessibility.language).toBe('fr');
        expect(mockCall[1].accessibility.logoAltText).toBe('Logo de la société');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when accessibility is missing', async () => {
        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_123',
          form: {
            // accessibility is missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Accessibility is required for the action "updateAccessibility" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when form is missing', async () => {
        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_123',
          // form is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Accessibility is required for the action "updateAccessibility" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Unsupported language code';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateAccessibility,
          formToken: 'token_123',
          form: {
            accessibility: {
              language: 'invalid_lang',
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Update Features Action', () => {
    describe('Success Cases', () => {
      it('should update features with afterSubmissionView', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              afterSubmissionView: {
                allowEditSubmission: true,
                allowResubmit: true,
                allowViewSubmission: true,
                description: 'Thank you for your submission',
                title: 'Success!',
                showSuccessImage: true,
                redirectAfterSubmission: {
                  enabled: false,
                  redirectUrl: null,
                },
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              afterSubmissionView: {
                allowEditSubmission: true,
                allowResubmit: true,
                allowViewSubmission: true,
                description: 'Thank you for your submission',
                title: 'Success!',
                showSuccessImage: true,
                redirectAfterSubmission: {
                  enabled: false,
                },
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormFeatures');
        expect(mockCall[1].features.afterSubmissionView.allowEditSubmission).toBe(true);
      });

      it('should update features with closeDate', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              closeDate: {
                enabled: true,
                date: '2024-12-31T23:59:59Z',
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              closeDate: {
                enabled: true,
                date: '2024-12-31T23:59:59Z',
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.closeDate.enabled).toBe(true);
        expect(mockCall[1].features.closeDate.date).toBe('2024-12-31T23:59:59Z');
      });

      it('should update features with password disabled', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              password: {
                enabled: false,
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              password: {
                enabled: false,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.password.enabled).toBe(false);
      });

      it('should update features with requireLogin', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              requireLogin: {
                enabled: true,
                redirectToLogin: true,
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              requireLogin: {
                enabled: true,
                redirectToLogin: true,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.requireLogin.enabled).toBe(true);
        expect(mockCall[1].features.requireLogin.redirectToLogin).toBe(true);
      });

      it('should update features with responseLimit', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              responseLimit: {
                enabled: true,
                limit: 100,
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              responseLimit: {
                enabled: true,
                limit: 100,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.responseLimit.enabled).toBe(true);
        expect(mockCall[1].features.responseLimit.limit).toBe(100);
      });

      it('should update features with preSubmissionView', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              preSubmissionView: {
                enabled: true,
                title: 'Welcome',
                description: 'Please fill out the form',
                startButton: {
                  text: 'Start',
                },
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              preSubmissionView: {
                enabled: true,
                title: 'Welcome',
                description: 'Please fill out the form',
                startButton: {
                  text: 'Start',
                },
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.preSubmissionView.enabled).toBe(true);
        expect(mockCall[1].features.preSubmissionView.title).toBe('Welcome');
      });

      it('should update features with monday settings', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              monday: {
                itemGroupId: 'group_123',
                includeNameQuestion: true,
                includeUpdateQuestion: false,
                syncQuestionAndColumnsTitles: true,
              },
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              monday: {
                itemGroupId: 'group_123',
                includeNameQuestion: true,
                includeUpdateQuestion: false,
                syncQuestionAndColumnsTitles: true,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.monday.itemGroupId).toBe('group_123');
        expect(mockCall[1].features.monday.includeNameQuestion).toBe(true);
      });

      it('should update features with reCaptchaChallenge', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              reCaptchaChallenge: true,
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              reCaptchaChallenge: true,
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.reCaptchaChallenge).toBe(true);
      });

      it('should handle formStringified parameter for Microsoft Copilot', async () => {
        const updateFeaturesResponse = {
          update_form_settings: {
            features: {
              reCaptchaChallenge: false,
            },
          },
        };

        mocks.setResponse(updateFeaturesResponse);

        const formObject = {
          features: {
            reCaptchaChallenge: false,
          },
        };

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          formStringified: JSON.stringify(formObject),
          // form is omitted, fallback will use formStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Features successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].features.reCaptchaChallenge).toBe(false);
      });
    });

    describe('Validation Errors', () => {
      it('should return error when features is missing', async () => {
        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            // features is missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Features is required for the action "updateFeatures" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when form is missing', async () => {
        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          // form is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Features is required for the action "updateFeatures" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Invalid response limit value';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateFeatures,
          formToken: 'token_123',
          form: {
            features: {
              responseLimit: {
                enabled: true,
                limit: -1,
              },
            },
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Update Question Order Action', () => {
    describe('Success Cases', () => {
      it('should update question order successfully', async () => {
        const updateQuestionOrderResponse = {
          update_form: {
            questions: [
              { id: 'question_3' },
              { id: 'question_1' },
              { id: 'question_2' },
            ],
          },
        };

        mocks.setResponse(updateQuestionOrderResponse);

        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_123',
          form: {
            questions: [
              { id: 'question_3' },
              { id: 'question_1' },
              { id: 'question_2' },
            ],
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Question order successfully updated:');
        expect(result.content[0].text).toContain('question_3');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormQuestionOrder');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          questions: [
            { id: 'question_3' },
            { id: 'question_1' },
            { id: 'question_2' },
          ],
        });
      });

      it('should update question order with different set of questions', async () => {
        const updateQuestionOrderResponse = {
          update_form: {
            questions: [
              { id: 'q_a' },
              { id: 'q_b' },
              { id: 'q_c' },
              { id: 'q_d' },
            ],
          },
        };

        mocks.setResponse(updateQuestionOrderResponse);

        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_456',
          form: {
            questions: [
              { id: 'q_a' },
              { id: 'q_b' },
              { id: 'q_c' },
              { id: 'q_d' },
            ],
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Question order successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].questions).toHaveLength(4);
        expect(mockCall[1].questions[0].id).toBe('q_a');
      });

      it('should handle formStringified parameter for Microsoft Copilot', async () => {
        const updateQuestionOrderResponse = {
          update_form: {
            questions: [
              { id: 'question_x' },
              { id: 'question_y' },
            ],
          },
        };

        mocks.setResponse(updateQuestionOrderResponse);

        const formObject = {
          questions: [
            { id: 'question_x' },
            { id: 'question_y' },
          ],
        };

        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_123',
          formStringified: JSON.stringify(formObject),
          // form is omitted, fallback will use formStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Question order successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].questions).toHaveLength(2);
        expect(mockCall[1].questions[0].id).toBe('question_x');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when questions is missing', async () => {
        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_123',
          form: {
            // questions is missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'List of dehydrated questions is required for the action "updateQuestionOrder" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when form is missing', async () => {
        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_123',
          // form is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'List of dehydrated questions is required for the action "updateQuestionOrder" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Question ID not found';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateQuestionOrder,
          formToken: 'token_123',
          form: {
            questions: [
              { id: 'nonexistent_question' },
            ],
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Update Form Header Action', () => {
    describe('Success Cases', () => {
      it('should update form header with title and description', async () => {
        const updateFormHeaderResponse = {
          update_form: {
            id: 'form_123',
            token: 'token_123',
            title: 'New Form Title',
            description: 'New Form Description',
          },
        };

        mocks.setResponse(updateFormHeaderResponse);

        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_123',
          form: {
            title: 'New Form Title',
            description: 'New Form Description',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Form header content successfully updated:');
        expect(result.content[0].text).toContain('New Form Title');
        expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[0]).toContain('mutation updateFormHeader');
        expect(mockCall[1]).toEqual({
          formToken: 'token_123',
          title: 'New Form Title',
          description: 'New Form Description',
        });
      });

      it('should update form header with title only', async () => {
        const updateFormHeaderResponse = {
          update_form: {
            id: 'form_456',
            token: 'token_456',
            title: 'Updated Title',
            description: null,
          },
        };

        mocks.setResponse(updateFormHeaderResponse);

        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_456',
          form: {
            title: 'Updated Title',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Form header content successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].title).toBe('Updated Title');
        expect(mockCall[1].description).toBeUndefined();
      });

      it('should update form header with description only', async () => {
        const updateFormHeaderResponse = {
          update_form: {
            id: 'form_789',
            token: 'token_789',
            title: 'Existing Title',
            description: 'Updated Description',
          },
        };

        mocks.setResponse(updateFormHeaderResponse);

        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_789',
          form: {
            description: 'Updated Description',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Form header content successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].title).toBeUndefined();
        expect(mockCall[1].description).toBe('Updated Description');
      });

      it('should handle formStringified parameter for Microsoft Copilot', async () => {
        const updateFormHeaderResponse = {
          update_form: {
            id: 'form_stringified',
            token: 'token_stringified',
            title: 'Copilot Title',
            description: 'Copilot Description',
          },
        };

        mocks.setResponse(updateFormHeaderResponse);

        const formObject = {
          title: 'Copilot Title',
          description: 'Copilot Description',
        };

        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_123',
          formStringified: JSON.stringify(formObject),
          // form is omitted, fallback will use formStringified
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Form header content successfully updated:');

        const mockCall = mocks.getMockRequest().mock.calls[0];
        expect(mockCall[1].title).toBe('Copilot Title');
        expect(mockCall[1].description).toBe('Copilot Description');
      });
    });

    describe('Validation Errors', () => {
      it('should return error when both title and description are missing', async () => {
        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_123',
          form: {
            // both title and description are missing
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Title or description is required for the action "updateFormHeader" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });

      it('should return error when form is missing', async () => {
        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'token_123',
          // form is missing
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toBe(
          'Title or description is required for the action "updateFormHeader" in the update form tool.'
        );
        expect(mocks.getMockRequest()).not.toHaveBeenCalled();
      });
    });

    describe('GraphQL Errors', () => {
      it('should handle GraphQL request exception', async () => {
        const errorMessage = 'Form not found';
        mocks.setError(errorMessage);

        const args: inputType = {
          action: FormActions.updateFormHeader,
          formToken: 'nonexistent_token',
          form: {
            title: 'New Title',
          },
        };

        const result = await callToolByNameRawAsync('update_form', args);

        expect(result.content[0].text).toContain('Failed to execute tool update_form');
        expect(result.content[0].text).toContain(errorMessage);
      });
    });
  });

  describe('Unknown Action', () => {
    it('should return error for unknown action', async () => {
      const args: Omit<inputType, 'action'> & { action: string } = {
        action: 'unknown_action',
        formToken: 'token_123',
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form: Invalid arguments');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Schema Validation', () => {
    it('should handle missing formToken via schema validation', async () => {
      const args: Partial<inputType> = {
        action: FormActions.activate,
        // formToken is missing
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form: Invalid arguments');
      expect(result.content[0].text).toContain('formToken');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle missing action via schema validation', async () => {
      const args: Partial<inputType> = {
        // action is missing
        formToken: 'token_123',
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toContain('Failed to execute tool update_form: Invalid arguments');
      expect(result.content[0].text).toContain('action');
      expect(result.content[0].text).toContain('Required');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string formToken', async () => {
      mocks.setError('Invalid form token');

      const args: inputType = {
        action: FormActions.activate,
        formToken: '',
      };

      const result = await callToolByNameRawAsync('update_form', args);

      // Empty string passes schema validation (it's a string), but fails at API level
      expect(result.content[0].text).toContain('Failed to execute tool update_form');
      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });

    it('should handle empty string formPassword', async () => {
      const args: inputType = {
        action: FormActions.setFormPassword,
        formToken: 'token_123',
        formPassword: '',
      };

      const result = await callToolByNameRawAsync('update_form', args);

      // Empty string is falsy in JavaScript, so validation should fail
      expect(result.content[0].text).toBe(
        'formPassword is required for the action "setFormPassword" in the update form tool.'
      );
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle empty tag object', async () => {
      const args: inputType = {
        action: FormActions.createTag,
        formToken: 'token_123',
        tag: {},
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toBe('Tag name is required for the action "createTag" in the update form tool.');
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle empty form object for updateAppearance', async () => {
      const args: inputType = {
        action: FormActions.updateAppearance,
        formToken: 'token_123',
        form: {},
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toBe(
        'Appearance is required for the action "updateAppearance" in the update form tool.'
      );
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });

    it('should handle null values in appearance', async () => {
      const updateAppearanceResponse = {
        update_form_settings: {
          appearance: {
            primaryColor: null,
            showProgressBar: false,
          },
        },
      };

      mocks.setResponse(updateAppearanceResponse);

      const args: inputType = {
        action: FormActions.updateAppearance,
        formToken: 'token_123',
        form: {
          appearance: {
            primaryColor: undefined,
            showProgressBar: false,
          },
        },
      };

      const result = await callToolByNameRawAsync('update_form', args);

      expect(result.content[0].text).toContain('Appearance successfully updated:');
      expect(mocks.getMockRequest()).toHaveBeenCalled();
    });
  });
});

