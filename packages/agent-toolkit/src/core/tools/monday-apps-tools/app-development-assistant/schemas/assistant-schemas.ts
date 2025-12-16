import { z } from 'zod';
import { MondayApiResponse } from '../../base-tool/base-monday-apps-tool';

export enum AppDevelopmentContextType {
  FULL = 'full',
  QUICK_START = 'quick_start',
  SDK_REFERENCE = 'sdk_reference',
  MONDAY_CODE_DEPLOYMENT = 'monday_code_deployment',
  BEST_PRACTICES = 'best_practices',
  TROUBLESHOOTING = 'troubleshooting',
}

export interface AppDevelopmentContextResponse extends MondayApiResponse {
  contextType: AppDevelopmentContextType;
  content: string;
}

export const getAppDevelopmentContextSchema = z.object({
  contextType: z
    .nativeEnum(AppDevelopmentContextType)
    .optional()
    .default(AppDevelopmentContextType.FULL)
    .describe(
      'The type of development context to retrieve. Options: "full" (complete guide), "quick_start" (getting started), "sdk_reference" (SDK usage), "monday_code_deployment" (deployment guide), "best_practices" (coding standards), "troubleshooting" (common issues). Defaults to "full"',
    ),
  specificTopic: z
    .string()
    .optional()
    .describe(
      'Optional specific topic to focus on within the context (e.g., "board views", "custom columns", "integrations", "OAuth", "storage API")',
    ),
});
