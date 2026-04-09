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
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
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
} from '../workforms.graphql.dev';
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

    await this.mondayApi.request<SetFormPasswordMutation>(setFormPassword, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Form password successfully set',
        form_token: input.formToken,
        action_name: 'setFormPassword',
      },
    };
  }

  async shortenFormUrl(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ShortenFormUrlMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ShortenFormUrlMutation>(shortenFormUrl, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Form URL successfully shortened',
        form_token: input.formToken,
        action_name: 'shortenFormUrl',
      },
    };
  }

  async deactivateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: DeactivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<DeactivateFormMutation>(deactivateForm, variables, { versionOverride: '2026-07' });

    return {
      content: { message: 'Form successfully deactivated', form_token: input.formToken, action_name: 'deactivateForm' },
    };
  }

  async activateForm(input: ToolInputType<typeof updateFormToolSchema>): Promise<ToolOutputType<never>> {
    const variables: ActivateFormMutationVariables = {
      formToken: input.formToken,
    };

    await this.mondayApi.request<ActivateFormMutation>(activateForm, variables, { versionOverride: '2026-07' });

    return {
      content: { message: 'Form successfully activated', form_token: input.formToken, action_name: 'activateForm' },
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

    const res = await this.mondayApi.request<CreateFormTagMutation>(createFormTag, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Tag successfully added',
        form_token: input.formToken,
        action_name: 'createTag',
        data: res.create_form_tag,
      },
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

    await this.mondayApi.request<DeleteFormTagMutation>(deleteFormTag, variables, { versionOverride: '2026-07' });

    return {
      content: { message: 'Tag deleted', form_token: input.formToken, tag_id: input.tag.id, action_name: 'deleteTag' },
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

    const res = await this.mondayApi.request<UpdateFormTagMutation>(updateFormTag, variables, { versionOverride: '2026-07' });

    if (!res.update_form_tag) {
      return {
        content: `Unable to update tag with id: ${input.tag.id}.`,
      };
    }

    return {
      content: { message: 'Tag updated', form_token: input.formToken, tag_id: input.tag.id, action_name: 'updateTag' },
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

    const res = await this.mondayApi.request<UpdateFormAppearanceMutation>(updateFormAppearance, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Appearance successfully updated',
        form_token: input.formToken,
        action_name: 'updateAppearance',
        data: res.update_form_settings?.appearance,
      },
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

    const res = await this.mondayApi.request<UpdateFormAccessibilityMutation>(updateFormAccessibility, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Accessibility successfully updated',
        form_token: input.formToken,
        action_name: 'updateAccessibility',
        data: res.update_form_settings?.accessibility,
      },
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

    const res = await this.mondayApi.request<UpdateFormFeaturesMutation>(updateFormFeatures, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Features successfully updated',
        form_token: input.formToken,
        action_name: 'updateFeatures',
        data: res.update_form_settings?.features,
      },
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

    const res = await this.mondayApi.request<UpdateFormQuestionOrderMutation>(updateFormQuestionOrder, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Question order successfully updated',
        form_token: input.formToken,
        action_name: 'updateQuestionOrder',
        data: res.update_form?.questions,
      },
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

    const res = await this.mondayApi.request<UpdateFormHeaderMutation>(updateFormHeader, variables, { versionOverride: '2026-07' });

    return {
      content: {
        message: 'Form header updated',
        form_token: input.formToken,
        action_name: 'updateFormHeader',
        data: res.update_form,
      },
    };
  }
}
