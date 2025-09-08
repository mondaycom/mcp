import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { FormQuestionActions } from '../workforms.types';
import {
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
  FormQuestionType,
  FormQuestionPrefillSources,
} from '../../../../../monday-graphql/generated/graphql';

const questionSchema = z.object({
  type: z.nativeEnum(FormQuestionType).describe(GraphQLDescriptions.question.properties.type),
  title: z.string().describe(GraphQLDescriptions.question.properties.title).optional(),
  description: z.string().describe(GraphQLDescriptions.question.properties.description).optional(),
  visible: z.boolean().describe(GraphQLDescriptions.question.properties.visible).optional(),
  required: z.boolean().describe(GraphQLDescriptions.question.properties.required).optional(),
  options: z
    .array(
      z.object({
        label: z.string().describe(GraphQLDescriptions.question.properties.selectOptionsLabel),
      }),
    )
    .describe(GraphQLDescriptions.question.properties.selectOptions)
    .optional(),
  settings: z
    .object({
      checkedByDefault: z
        .boolean()
        .describe(GraphQLDescriptions.questionSettings.properties.checkedByDefault)
        .optional(),
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
      prefixAutofilled: z
        .boolean()
        .describe(GraphQLDescriptions.questionSettings.properties.prefixAutofilled)
        .optional(),
      prefixPredefined: z
        .object({
          enabled: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedEnabled),
          prefix: z
            .string()
            .describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedPrefix)
            .optional(),
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
    .optional(),
});

export const formQuestionsEditorToolSchema = {
  action: z.nativeEnum(FormQuestionActions).describe(GraphQLDescriptions.question.actions.type),
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId).optional(),
  question: questionSchema.describe(GraphQLDescriptions.question.actions.question).optional(),
};
