import { z } from 'zod';

import { createForm, createFormQuestion, deleteFormQuestion, updateFormQuestion } from './workforms.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { GraphQLDescriptions } from './workforms.consts';
import { CreateFormQuestionMutation, DeleteFormQuestionMutation, UpdateFormQuestionMutation } from 'src/monday-graphql';
import { FormQuestionsOperation } from './workforms.types';

export const formQuestionsEditorToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
  operation: z.nativeEnum(FormQuestionsOperation).describe(GraphQLDescriptions.question.operations.type),
};

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
    const variables = {
      formToken: input.formToken,
      questionId: input.questionId,
    };

    switch (input.operation) {
      case FormQuestionsOperation.Delete:
        await this.mondayApi.request<DeleteFormQuestionMutation>(deleteFormQuestion, variables);

        return {
          content: `Form question with id ${input.questionId} deleted successfully.`,
        };
      case FormQuestionsOperation.Update:
        await this.mondayApi.request<UpdateFormQuestionMutation>(updateFormQuestion, variables);

        return {
          content: `Form question with id ${input.questionId} updated successfully.`,
        };
      case FormQuestionsOperation.Create:
        await this.mondayApi.request<CreateFormQuestionMutation>(createFormQuestion, variables);

        return {
          content: `Form question with id ${input.questionId} created successfully.`,
        };
    }
  }
}
