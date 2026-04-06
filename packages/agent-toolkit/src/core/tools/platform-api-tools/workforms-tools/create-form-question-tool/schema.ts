import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { createQuestionSchema } from '../workforms.schema';

export const createFormQuestionToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  question: createQuestionSchema.describe(GraphQLDescriptions.question.operations.createQuestion),
};
