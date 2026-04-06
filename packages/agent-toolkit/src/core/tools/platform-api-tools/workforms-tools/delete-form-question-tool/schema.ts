import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';

export const deleteFormQuestionToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
};
