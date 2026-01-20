import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export interface AppDevelopmentContextResponse extends MondayApiResponse {
  queryId?: string;
  conversationId?: string;
}

export const getAppDevelopmentContextSchema = z.object({
  query: z
    .string()
    .describe(
      'The question or topic to search in the monday.com apps documentation. Be specific for better results. Examples: "How do I create a board view?", "What OAuth scopes do I need for reading boards?", "How to deploy to monday-code?"',
    ),
});
