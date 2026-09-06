import { z } from 'zod';
import { FORM_TOKEN_DESCRIPTION } from '../utils/form-token';

export const getFormToolSchema = {
  formToken: z.string().min(1).describe(FORM_TOKEN_DESCRIPTION),
};
