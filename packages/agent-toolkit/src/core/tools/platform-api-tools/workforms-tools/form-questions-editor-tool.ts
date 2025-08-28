import { z } from 'zod';
import { createFormQuestion, deleteFormQuestion, updateFormQuestion } from './workforms.graphql';
import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { CreateFormQuestionMutation, DeleteFormQuestionMutation, UpdateFormQuestionMutation } from 'src/monday-graphql';
import { FormQuestionsOperation } from './workforms.types';
import { formQuestionsEditorToolSchema } from './workforms.schemas';

export class FormQuestionsEditorTool extends BaseMondayApiTool<any, never> {
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

  getInputSchema() {
    return formQuestionsEditorToolSchema;
  }

  protected async executeInternal(
    input: z.infer<typeof formQuestionsEditorToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const baseVariables = {
      formToken: input.formToken,
    };

    switch (input.operation) {
      case FormQuestionsOperation.Delete: {
        const deleteVariables = {
          ...baseVariables,
          questionId: input.questionId,
        };
        await this.mondayApi.request<DeleteFormQuestionMutation>(deleteFormQuestion, deleteVariables);

        return {
          content: `Form question with id ${input.questionId} deleted successfully.`,
        };
      }
      case FormQuestionsOperation.Update: {
        const updateVariables = {
          ...baseVariables,
          questionId: input.questionId,
          question: input.question,
        };
        await this.mondayApi.request<UpdateFormQuestionMutation>(updateFormQuestion, updateVariables);

        return {
          content: `Form question with id ${input.questionId} updated successfully.`,
        };
      }
      case FormQuestionsOperation.Create: {
        const createVariables = {
          ...baseVariables,
          question: input.question,
        };
        await this.mondayApi.request<CreateFormQuestionMutation>(createFormQuestion, createVariables);

        return {
          content: `Form question created successfully.`,
        };
      }
    }
  }
}
