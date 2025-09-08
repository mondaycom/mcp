import { createFormQuestion, deleteFormQuestion, updateFormQuestion } from '../workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import {
  CreateFormQuestionMutation,
  DeleteFormQuestionMutation,
  UpdateFormQuestionMutation,
  DeleteFormQuestionMutationVariables,
  UpdateFormQuestionMutationVariables,
  CreateFormQuestionMutationVariables,
  CreateQuestionInput,
} from '../../../../../monday-graphql/generated/graphql';
import { FormQuestionActions } from '../workforms.types';
import { formQuestionsEditorToolSchema } from './schema';

export class FormQuestionsEditorTool extends BaseMondayApiTool<typeof formQuestionsEditorToolSchema, never> {
  name = 'form_questions_editor';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Form Questions Editor',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create, update, or delete a question in a monday.com form';
  }

  getInputSchema(): typeof formQuestionsEditorToolSchema {
    return formQuestionsEditorToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof formQuestionsEditorToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const baseVariables: { formToken: string } = {
      formToken: input.formToken,
    };

    switch (input.action) {
      case FormQuestionActions.Delete: {
        const questionId = input.questionId;
        if (!questionId) {
          return {
            content: `Question ID is required when deleting a question.`,
          };
        }

        const deleteVariables: DeleteFormQuestionMutationVariables = {
          ...baseVariables,
          questionId,
        };
        await this.mondayApi.request<DeleteFormQuestionMutation>(deleteFormQuestion, deleteVariables);

        return {
          content: `Form question with id ${questionId} deleted successfully.`,
        };
      }
      case FormQuestionActions.Update: {
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
          ...baseVariables,
          questionId,
          question,
        };
        await this.mondayApi.request<UpdateFormQuestionMutation>(updateFormQuestion, updateVariables);

        return {
          content: `Form question with id ${questionId} updated successfully.`,
        };
      }
      case FormQuestionActions.Create: {
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
          ...baseVariables,
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
      default:
        return {
          content: `Unknown action: ${input.action}`,
        };
    }
  }
}
