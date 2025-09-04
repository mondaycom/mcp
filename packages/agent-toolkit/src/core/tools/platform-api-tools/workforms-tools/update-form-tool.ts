import {
  ActivateFormMutation,
  ActivateFormMutationVariables,
  CreateFormTagMutation,
  DeactivateFormMutation,
  DeactivateFormMutationVariables,
  DeleteFormTagMutation,
  FormTag,
  GetFormQuery,
  GetFormQueryVariables,
  ResponseForm,
  SetFormPasswordMutation,
  SetFormPasswordMutationVariables,
  ShortenFormUrlMutation,
  ShortenFormUrlMutationVariables,
  UpdateFormTagMutation,
} from '../../../../monday-graphql/generated/graphql';
import {
  activateForm,
  createFormTag,
  deactivateForm,
  deleteFormTag,
  getForm,
  setFormPassword,
  shortenFormUrl,
  updateFormTag,
} from './workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { FormActions, updateFormToolSchema } from './workforms.schemas';
import { Tag, TagPayload } from './workforms.types';

export class UpdateFormTool extends BaseMondayApiTool<typeof updateFormToolSchema, never> {
  name = 'update_form';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Form',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Update a monday.com form. Handles the following form update operations: 
    - update form's feature settings,
    - update form's appearance settings
    - update form's accessibility settings
    - update form's title
    - update form's description
    - update form's question order
    - update form's list of form tags
    - set or update the form's password with the action "setFormPassword"
    - shorten form's url with the action "shortenFormUrl"
    - deactivate form with the action "deactivateForm"
    - reactivate form with the action "activateForm"`;
  }

  getInputSchema(): typeof updateFormToolSchema {
    return updateFormToolSchema;
  }

  private async getCurrentForm(formToken: string): Promise<ResponseForm> {
    const variables: GetFormQueryVariables = {
      formToken,
    };

    const res = await this.mondayApi.request<GetFormQuery>(getForm, variables);

    if (!res.form) {
      throw new Error(`Form with token ${formToken} not found or you don't have access to it.`);
    }

    return res.form;
  }

  private async setFormPassword(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.formPassword) {
      return {
        content: `formPassword is required for the action "setFormPassword" in the update form tool.`,
      };
    }

    const variables: SetFormPasswordMutationVariables = {
      formToken: input.formToken,
      input: {
        password: input.formPassword,
      },
    };

    await this.mondayApi.request<SetFormPasswordMutation>(setFormPassword, variables);

    return {
      content: 'Form password successfully set.',
    };
  }

  private async shortenFormUrl(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ShortenFormUrlMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ShortenFormUrlMutation>(shortenFormUrl, variables);

    return {
      content: 'Form URL successfully shortened.',
    };
  }

  private async deactivateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: DeactivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<DeactivateFormMutation>(deactivateForm, variables);

    return {
      content: 'Form successfully deactivated.',
    };
  }

  private async activateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ActivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ActivateFormMutation>(activateForm, variables);

    return {
      content: 'Form successfully activated.',
    };
  }

  private async updateFormTags(formToken: string, newTags: TagPayload[], currentTags: Tag[]): Promise<void> {
    const currentTagIds = new Set(currentTags.map((tag) => tag.id));
    const newTagIds = new Set(newTags.map((tag) => tag.id).filter((id) => id !== undefined));

    const tagIdsToDelete = [...currentTagIds].filter((tagId) => !newTagIds.has(tagId));
    const tagsToCreate = newTags.filter((tag) => tag.id === undefined && tag.name !== undefined);
    const tagsToUpdate = newTags.filter((tag) => tag.id !== undefined);

    const promises = [];
    for (const tagId of tagIdsToDelete) {
      promises.push(this.mondayApi.request<DeleteFormTagMutation>(deleteFormTag, { formToken, tagId }));
    }

    for (const tag of tagsToCreate) {
      if (!tag.name) {
        throw new Error('Tag name is required when creating a new tag');
      }

      promises.push(this.mondayApi.request<CreateFormTagMutation>(createFormTag, { formToken, tag }));
    }
    for (const tag of tagsToUpdate) {
      promises.push(this.mondayApi.request<UpdateFormTagMutation>(updateFormTag, { formToken, tagId: tag.id, tag }));
    }

    await Promise.all(promises);
  }

  private async updateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (input.form.tags) {
      const currentForm = await this.getCurrentForm(input.formToken);
      await this.updateFormTags(input.formToken, input.form.tags, currentForm.tags as Tag[]);
    }

    const form = await this.getCurrentForm(input.formToken);

    return {
      content: `Form successfully updated. Updated Form: ${JSON.stringify(form, null, 2)}`,
    };
  }

  protected async executeInternal(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (input.action === FormActions.setFormPassword) {
      return await this.setFormPassword(input);
    } else if (input.action === FormActions.shortenFormUrl) {
      return await this.shortenFormUrl(input);
    } else if (input.action === FormActions.deactivate) {
      return await this.deactivateForm(input);
    } else if (input.action === FormActions.activate) {
      return await this.activateForm(input);
    } else if (input.action === FormActions.update) {
      return await this.updateForm(input);
    }

    return {
      content: 'Form successfully updated.',
    };
  }
}
