import {
  ActivateFormMutation,
  ActivateFormMutationVariables,
  CreateFormTagMutation,
  CreateFormTagMutationVariables,
  DeactivateFormMutation,
  DeactivateFormMutationVariables,
  DeleteFormTagMutation,
  DeleteFormTagMutationVariables,
  FormAccessibilityInput,
  FormAppearanceInput,
  FormFeaturesInput,
  FormTag,
  GetFormQuery,
  GetFormQueryVariables,
  QuestionOrderInput,
  ResponseForm,
  SetFormPasswordMutation,
  SetFormPasswordMutationVariables,
  ShortenFormUrlMutation,
  ShortenFormUrlMutationVariables,
  UpdateFormAccessibilityMutation,
  UpdateFormAccessibilityMutationVariables,
  UpdateFormAppearanceMutation,
  UpdateFormAppearanceMutationVariables,
  UpdateFormFeaturesMutation,
  UpdateFormHeaderMutation,
  UpdateFormHeaderMutationVariables,
  UpdateFormQuestionOrderMutation,
  UpdateFormQuestionOrderMutationVariables,
  UpdateFormTagMutation,
  UpdateFormTagMutationVariables,
} from '../../../../monday-graphql/generated/graphql';
import {
  activateForm,
  createFormTag,
  deactivateForm,
  deleteFormTag,
  getForm,
  setFormPassword,
  shortenFormUrl,
  updateFormAccessibility,
  updateFormAppearance,
  updateFormFeatures,
  updateFormHeader,
  updateFormQuestionOrder,
  updateFormTag,
} from './workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { FormActions, updateFormToolSchema } from './workforms.schemas';
import { Tag, TagPayload } from './workforms.types';
import { UpdateFormFeaturesMutationVariables } from '../../../../monday-graphql/generated/graphql';

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
    return `Update a monday.com form. Handles the following form update actions: 
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

  private async updateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const form = await this.getCurrentForm(input.formToken);

    return {
      content: `Form successfully updated. Updated Form: ${JSON.stringify(form, null, 2)}`,
    };
  }

  private async createTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.tag) {
      return {
        content: 'Tag is required for the action "createTag" in the update form tool.',
      };
    }

    if (!input.tag.name) {
      return {
        content: 'Tag name is are required for the action "createTag" in the update form tool.',
      };
    }

    const variables: CreateFormTagMutationVariables = {
      formToken: input.formToken,
      tag: {
        name: input.tag.name,
        value: input.tag.value,
      },
    };

    const res = await this.mondayApi.request<CreateFormTagMutation>(createFormTag, variables);

    return {
      content: `Tag successfully added: ${JSON.stringify(res.create_form_tag, null, 2)}`,
    };
  }

  private async deleteTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.tag) {
      return {
        content: 'Tag is required for the action "deleteTag" in the update form tool.',
      };
    }

    if (!input.tag.id) {
      return {
        content: 'Tag id is required for the action "deleteTag" in the update form tool.',
      };
    }

    const variables: DeleteFormTagMutationVariables = {
      formToken: input.formToken,
      tagId: input.tag.id,
    };

    await this.mondayApi.request<DeleteFormTagMutation>(deleteFormTag, variables);

    return {
      content: `Tag with id: ${input.tag.id} successfully deleted.`,
    };
  }

  private async updateTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.tag) {
      return {
        content: 'Tag is required for the action "updateTag" in the update form tool.',
      };
    }

    if (!input.tag.id || !input.tag.value) {
      return {
        content: 'Tag id and value are required for the action "updateTag" in the update form tool.',
      };
    }

    const variables: UpdateFormTagMutationVariables = {
      formToken: input.formToken,
      tagId: input.tag.id,
      tag: {
        value: input.tag.value,
      },
    };

    const res = await this.mondayApi.request<UpdateFormTagMutation>(updateFormTag, variables);

    if (!res.update_form_tag) {
      return {
        content: `Unable to update tag with id: ${input.tag.id}.`,
      };
    }

    return {
      content: `Tag with id: ${input.tag.id} successfully updated to value: ${input.tag.value}.`,
    };
  }

  private async updateAppearance(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.form?.appearance) {
      return {
        content: 'Appearance is required for the action "updateAppearance" in the update form tool.',
      };
    }

    const variables: UpdateFormAppearanceMutationVariables = {
      formToken: input.formToken,
      appearance: input.form.appearance as FormAppearanceInput,
    };

    const res = await this.mondayApi.request<UpdateFormAppearanceMutation>(updateFormAppearance, variables);

    return {
      content: `Appearance successfully updated: ${JSON.stringify(res.update_form_settings?.appearance, null, 2)}`,
    };
  }

  private async updateAccessibility(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.form?.accessibility) {
      return {
        content: 'Accessibility is required for the action "updateAccessibility" in the update form tool.',
      };
    }

    const variables: UpdateFormAccessibilityMutationVariables = {
      formToken: input.formToken,
      accessibility: input.form.accessibility as FormAccessibilityInput,
    };

    const res = await this.mondayApi.request<UpdateFormAccessibilityMutation>(updateFormAccessibility, variables);

    return {
      content: `Accessibility successfully updated: ${JSON.stringify(res.update_form_settings?.accessibility, null, 2)}`,
    };
  }

  private async updateFeatures(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.form?.features) {
      return {
        content: 'Features is required for the action "updateFeatures" in the update form tool.',
      };
    }

    const variables: UpdateFormFeaturesMutationVariables = {
      formToken: input.formToken,
      features: input.form.features as FormFeaturesInput,
    };

    const res = await this.mondayApi.request<UpdateFormFeaturesMutation>(updateFormFeatures, variables);

    return {
      content: `Features successfully updated: ${JSON.stringify(res.update_form_settings?.features, null, 2)}`,
    };
  }

  private async updateQuestionOrder(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.form?.questions) {
      return {
        content:
          'List of dehydrated questions is required for the action "updateQuestionOrder" in the update form tool.',
      };
    }

    const variables: UpdateFormQuestionOrderMutationVariables = {
      formToken: input.formToken,
      questions: input.form.questions as QuestionOrderInput[],
    };

    const res = await this.mondayApi.request<UpdateFormQuestionOrderMutation>(updateFormQuestionOrder, variables);

    return {
      content: `Question order successfully updated: ${JSON.stringify(res.update_form?.questions, null, 2)}`,
    };
  }

  private async updateFormHeader(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.form?.title && !input.form?.description) {
      return {
        content: 'Title or description is required for the action "updateFormHeader" in the update form tool.',
      };
    }

    const variables: UpdateFormHeaderMutationVariables = {
      formToken: input.formToken,
      title: input.form.title,
      description: input.form.description,
    };

    const res = await this.mondayApi.request<UpdateFormHeaderMutation>(updateFormHeader, variables);

    return {
      content: `Form header content successfully updated: ${JSON.stringify(res.update_form, null, 2)}`,
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
    } else if (input.action === FormActions.createTag) {
      return await this.createTag(input);
    } else if (input.action === FormActions.deleteTag) {
      return await this.deleteTag(input);
    } else if (input.action === FormActions.updateTag) {
      return await this.updateTag(input);
    } else if (input.action === FormActions.updateAppearance) {
      return await this.updateAppearance(input);
    } else if (input.action === FormActions.updateAccessibility) {
      return await this.updateAccessibility(input);
    } else if (input.action === FormActions.updateFeatures) {
      return await this.updateFeatures(input);
    } else if (input.action === FormActions.updateQuestionOrder) {
      return await this.updateQuestionOrder(input);
    } else if (input.action === FormActions.updateFormHeader) {
      return await this.updateFormHeader(input);
    }

    return {
      content: 'Received an invalid action for the update form tool.',
    };
  }
}
