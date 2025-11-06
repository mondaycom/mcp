import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';

export const getFormToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
};
