import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { FormQuestionActions } from '../workforms.types';
import {
  ConditionOperator,
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
  FormQuestionType,
  FormQuestionPrefillSources,
} from '../../../../../monday-graphql/generated/graphql/graphql';
const questionSchema = z.object({
  type: z.nativeEnum(FormQuestionType).describe(GraphQLDescriptions.question.properties.type),
  title: z.string().describe(GraphQLDescriptions.question.properties.title).optional(),
  description: z.string().describe(GraphQLDescriptions.question.properties.description).optional(),
  visible: z.boolean().optional(),
  required: z.boolean().optional(),
  insert_after_question_id: z
    .string()
    .nullish()
    .describe(GraphQLDescriptions.question.properties.insertAfterQuestionId),
  page_block_id: z.string().nullish().describe(GraphQLDescriptions.question.properties.pageBlockId),
  existing_column_id: z.string().describe(GraphQLDescriptions.question.properties.existingColumnId).optional(),
  show_if_rules: z
    .object({
      operator: z.nativeEnum(ConditionOperator),
      rules: z.array(
        z.object({
          operator: z.nativeEnum(ConditionOperator),
          conditions: z.array(
            z.object({
              building_block_id: z.string().describe(GraphQLDescriptions.question.showIfConditionBuildingBlockId),
              operator: z.nativeEnum(ConditionOperator),
              values: z.array(z.string()).describe(GraphQLDescriptions.question.showIfConditionValues),
            }),
          ),
        }),
      ),
    })
    .describe(GraphQLDescriptions.question.showIfRules)
    .optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string().optional().describe(GraphQLDescriptions.question.properties.selectOptionsValue),
        visible: z.boolean().optional(),
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
          enabled: z.boolean(),
          prefix: z
            .string()
            .describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedPrefix)
            .optional(),
        })
        .describe(GraphQLDescriptions.questionSettings.properties.prefixPredefined)
        .optional(),
      skipValidation: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.skipValidation).optional(),
      labelLimitCount: z
        .number()
        .int()
        .describe(GraphQLDescriptions.questionSettings.properties.labelLimitCount)
        .optional(),
      label_limit_count_enabled: z
        .boolean()
        .describe(GraphQLDescriptions.questionSettings.properties.labelLimitCountEnabled)
        .optional(),
      default_answer: z.string().describe(GraphQLDescriptions.questionSettings.properties.defaultAnswer).optional(),
      prefill: z
        .object({
          enabled: z.boolean(),
          lookup: z.string().describe(GraphQLDescriptions.questionSettings.properties.prefillLookup).optional(),
          source: z.nativeEnum(FormQuestionPrefillSources).optional(),
        })
        .describe(GraphQLDescriptions.questionSettings.properties.prefill)
        .optional(),
    })
    .describe('Type-specific question settings. Check each field description to see which question type it applies to.')
    .optional(),
});

export const formQuestionsEditorToolSchema = {
  action: z.nativeEnum(FormQuestionActions).describe(GraphQLDescriptions.question.actions.type),
  formToken: z.string(),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId).optional(),
  question: questionSchema.describe(GraphQLDescriptions.question.actions.question).optional(),
};
