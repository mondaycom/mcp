import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { FormQuestionActions } from '../workforms.types';
import { questionSettingsSchema, questionOptionsSchema } from '../workforms.schema';
import { FormQuestionType } from '../../../../../monday-graphql/generated/graphql/graphql';

const questionSchema = z.object({
  type: z.nativeEnum(FormQuestionType).describe(GraphQLDescriptions.question.properties.type),
  title: z.string().describe(GraphQLDescriptions.question.properties.title).optional(),
  description: z.string().describe(GraphQLDescriptions.question.properties.description).optional(),
  visible: z.boolean().describe(GraphQLDescriptions.question.properties.visible).optional(),
  required: z.boolean().describe(GraphQLDescriptions.question.properties.required).optional(),
  options: questionOptionsSchema,
  settings: questionSettingsSchema,
});

export const formQuestionsEditorToolSchema = {
  action: z.nativeEnum(FormQuestionActions).describe(GraphQLDescriptions.question.actions.type),
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId).optional(),
  question: questionSchema.describe(GraphQLDescriptions.question.actions.question).optional(),
};
