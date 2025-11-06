import {
  CreateFormQuestionMutation,
  CreateFormQuestionMutationVariables,
  DeleteFormQuestionMutation,
  DeleteFormQuestionMutationVariables,
  UpdateFormQuestionMutation,
  UpdateFormQuestionMutationVariables,
} from '../../../../../monday-graphql/generated/graphql';
import { createFormQuestion, deleteFormQuestion, updateFormQuestion } from '../workforms.graphql';
import { ToolInputType, ToolOutputType } from '../../../../tool';
import { ApiClient } from '@mondaydotcomorg/api';
import { formQuestionsEditorToolSchema } from '../form-questions-editor-tool/schema';

export class FormQuestionsEditorToolHelpers {
  constructor(private mondayApi: ApiClient) {}

  async deleteQuestion(input: ToolInputType<typeof formQuestionsEditorToolSchema>): Promise<ToolOutputType<never>> {
    const questionId = input.questionId;
    if (!questionId) {
      return {
        content: `Question ID is required when deleting a question.`,
      };
    }

    const deleteVariables: DeleteFormQuestionMutationVariables = {
      formToken: input.formToken,
      questionId,
    };

    await this.mondayApi.request<DeleteFormQuestionMutation>(deleteFormQuestion, deleteVariables);

    return {
      content: `Form question with id ${questionId} deleted successfully.`,
    };
  }

  async updateQuestion(input: ToolInputType<typeof formQuestionsEditorToolSchema>): Promise<ToolOutputType<never>> {
    const questionId = input.questionId;
    if (!questionId) {
      return {
        content: `Question ID is required when updating a question.`,
      };
    }

    const question = input.question;
    if (!question) {
      return {
        content: `Must provide updated patch props for the question when updating.`,
      };
    }

    const updateVariables: UpdateFormQuestionMutationVariables = {
      formToken: input.formToken,
      questionId,
      question,
    };

    await this.mondayApi.request<UpdateFormQuestionMutation>(updateFormQuestion, updateVariables);

    return {
      content: `Form question with id ${questionId} updated successfully.`,
    };
  }

  async createQuestion(input: ToolInputType<typeof formQuestionsEditorToolSchema>): Promise<ToolOutputType<never>> {
    const question = input.question;
    if (!question) {
      return {
        content: `Must provide a full question payload when creating a question.`,
      };
    }

    if (!question.title) {
      return {
        content: `Must provide a title for the question when creating a question.`,
      };
    }

    const createVariables: CreateFormQuestionMutationVariables = {
      formToken: input.formToken,
      question: {
        ...question,
        title: question.title,
      },
    };

    const result = await this.mondayApi.request<CreateFormQuestionMutation>(createFormQuestion, createVariables);

    return {
      content: `Form question created successfully. ID: ${result.create_form_question?.id}`,
    };
  }
}
