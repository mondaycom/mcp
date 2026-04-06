import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { updateQuestionSchema } from '../workforms.schema';

export const updateFormQuestionToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
  question: updateQuestionSchema.describe(GraphQLDescriptions.question.operations.updateQuestion),
};
