import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import {
  FormQuestionType,
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
  FormQuestionPrefillSources,
} from '../../../../../monday-graphql/generated/graphql/graphql';

const questionSettingsSchema = z
  .object({
    checkedByDefault: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.checkedByDefault).optional(),
    defaultCurrentDate: z
      .boolean()
      .describe(GraphQLDescriptions.questionSettings.properties.defaultCurrentDate)
      .optional(),
    display: z
      .nativeEnum(FormQuestionSelectDisplay)
      .describe(GraphQLDescriptions.questionSettings.properties.display)
      .optional(),
    includeTime: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.includeTime).optional(),
    locationAutofilled: z
      .boolean()
      .describe(GraphQLDescriptions.questionSettings.properties.locationAutofilled)
      .optional(),
    optionsOrder: z
      .nativeEnum(FormQuestionSelectOrderByOptions)
      .describe(GraphQLDescriptions.questionSettings.properties.optionsOrder)
      .optional(),
    prefixAutofilled: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.prefixAutofilled).optional(),
    prefixPredefined: z
      .object({
        enabled: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedEnabled),
        prefix: z.string().describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedPrefix).optional(),
      })
      .describe(GraphQLDescriptions.questionSettings.properties.prefixPredefined)
      .optional(),
    skipValidation: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.skipValidation).optional(),
    prefill: z
      .object({
        enabled: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.prefillEnabled),
        lookup: z.string().describe(GraphQLDescriptions.questionSettings.properties.prefillLookup).optional(),
        source: z
          .nativeEnum(FormQuestionPrefillSources)
          .describe(GraphQLDescriptions.questionSettings.properties.prefillSource)
          .optional(),
      })
      .describe(GraphQLDescriptions.questionSettings.properties.prefill)
      .optional(),
  })
  .optional();

const questionPatchSchema = z.object({
  type: z.nativeEnum(FormQuestionType).describe(GraphQLDescriptions.question.properties.type).optional(),
  title: z.string().describe(GraphQLDescriptions.question.properties.title).optional(),
  description: z.string().describe(GraphQLDescriptions.question.properties.description).optional(),
  visible: z.boolean().describe(GraphQLDescriptions.question.properties.visible).optional(),
  required: z.boolean().describe(GraphQLDescriptions.question.properties.required).optional(),
  settings: questionSettingsSchema,
});

export const updateFormQuestionToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
  question: questionPatchSchema.describe(GraphQLDescriptions.question.operations.updateQuestion),
};
