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
  QuestionOrderInput,
  SetFormPasswordMutation,
  SetFormPasswordMutationVariables,
  ShortenFormUrlMutation,
  ShortenFormUrlMutationVariables,
  UpdateFormAccessibilityMutation,
  UpdateFormAccessibilityMutationVariables,
  UpdateFormAppearanceMutation,
  UpdateFormAppearanceMutationVariables,
  UpdateFormFeaturesMutation,
  UpdateFormFeaturesMutationVariables,
  UpdateFormHeaderMutation,
  UpdateFormHeaderMutationVariables,
  UpdateFormQuestionOrderMutation,
  UpdateFormQuestionOrderMutationVariables,
  UpdateFormTagMutation,
  UpdateFormTagMutationVariables,
} from '../../../../../monday-graphql/generated/graphql';
import {
  activateForm,
  createFormTag,
  deactivateForm,
  deleteFormTag,
  setFormPassword,
  shortenFormUrl,
  updateFormAccessibility,
  updateFormAppearance,
  updateFormFeatures,
  updateFormHeader,
  updateFormQuestionOrder,
  updateFormTag,
} from '../workforms.graphql';
import { ToolInputType, ToolOutputType } from '../../../../tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { updateFormToolSchema } from '../update-form-tool/schema';

export class UpdateFormToolHelpers {
  constructor(private mondayApi: ApiClient) {}

  async setFormPassword(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.formPassword) {
      return {
        content: 'formPassword is required for the action "setFormPassword" in the update form tool.',
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

  async shortenFormUrl(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ShortenFormUrlMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ShortenFormUrlMutation>(shortenFormUrl, variables);

    return {
      content: 'Form URL successfully shortened.',
    };
  }

  async deactivateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: DeactivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<DeactivateFormMutation>(deactivateForm, variables);

    return {
      content: 'Form successfully deactivated.',
    };
  }

  async activateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ActivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ActivateFormMutation>(activateForm, variables);

    return {
      content: 'Form successfully activated.',
    };
  }

  async createTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.tag) {
      return {
        content: 'Tag is required for the action "createTag" in the update form tool.',
      };
    }

    if (!input.tag.name) {
      return {
        content: 'Tag name is required for the action "createTag" in the update form tool.',
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

  async deleteTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateTag(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateAppearance(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateAccessibility(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateFeatures(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateQuestionOrder(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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

  async updateFormHeader(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
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
}
