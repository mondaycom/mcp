import { z } from 'zod';
import { GraphQLDescriptions } from './workforms.consts';
import {
  FormQuestionsOperation,
  PrefillSources,
  SelectDisplay,
  SelectOrderByOptions,
  WorkformsQuestionType,
} from './workforms.types';
import { BoardKind } from 'src/monday-graphql/generated/graphql';

export const getFormToolSchema = {
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
};

export const createFormToolSchema = {
  destination_workspace_id: z.number().describe(GraphQLDescriptions.form.args.destinationWorkspaceId),
  destination_folder_id: z.number().optional().describe(GraphQLDescriptions.form.args.destinationFolderId),
  destination_folder_name: z.string().optional().describe(GraphQLDescriptions.form.args.destinationFolderName),
  board_kind: z.nativeEnum(BoardKind).optional().describe(GraphQLDescriptions.form.args.boardKind),
  destination_name: z.string().optional().describe(GraphQLDescriptions.form.args.destinationName),
  board_owner_ids: z.array(z.number()).optional().describe(GraphQLDescriptions.form.args.boardOwnerIds),
  board_owner_team_ids: z.array(z.number()).optional().describe(GraphQLDescriptions.form.args.boardOwnerTeamIds),
  board_subscriber_ids: z.array(z.number()).optional().describe(GraphQLDescriptions.form.args.boardSubscriberIds),
  board_subscriber_teams_ids: z
    .array(z.number())
    .optional()
    .describe(GraphQLDescriptions.form.args.boardSubscriberTeamsIds),
};

const baseQuestionSchema = z.object({
  type: z.nativeEnum(WorkformsQuestionType).describe(GraphQLDescriptions.question.properties.type),
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
      display: z.nativeEnum(SelectDisplay).describe(GraphQLDescriptions.questionSettings.properties.display).optional(),
      includeTime: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.includeTime).optional(),
      labelLimitCount: z.number().describe(GraphQLDescriptions.questionSettings.properties.labelLimitCount).optional(),
      locationAutofilled: z
        .boolean()
        .describe(GraphQLDescriptions.questionSettings.properties.locationAutofilled)
        .optional(),
      optionsOrder: z
        .array(z.nativeEnum(SelectOrderByOptions))
        .describe(GraphQLDescriptions.questionSettings.properties.optionsOrder)
        .optional(),
      prefixAutofilled: z
        .boolean()
        .describe(GraphQLDescriptions.questionSettings.properties.prefixAutofilled)
        .optional(),
      prefixPredefined: z
        .object({
          enabled: z
            .boolean()
            .describe(GraphQLDescriptions.questionSettings.properties.prefixPredefinedEnabled)
            .optional(),
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
          enabled: z.boolean().describe(GraphQLDescriptions.questionSettings.properties.prefillEnabled).optional(),
          lookup: z.string().describe(GraphQLDescriptions.questionSettings.properties.prefillLookup).optional(),
          source: z
            .nativeEnum(PrefillSources)
            .describe(GraphQLDescriptions.questionSettings.properties.prefillSource)
            .optional(),
        })
        .describe(GraphQLDescriptions.questionSettings.properties.prefill)
        .optional(),
    })
    .optional(),
});

// Common validation function to avoid duplication
const validateOptions = (data: any, ctx: z.RefinementCtx) => {
  const isSelectType =
    data.type === WorkformsQuestionType.SingleSelect || data.type === WorkformsQuestionType.MultiSelect;

  if (!isSelectType && data.options) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Options can only be provided for SingleSelect or MultiSelect question types',
      path: ['options'],
    });
  }
};

const createQuestionSchema = baseQuestionSchema
  .extend({
    title: z.string().describe(GraphQLDescriptions.question.properties.title),
  })
  .superRefine(validateOptions);

const updateQuestionSchema = baseQuestionSchema
  .extend({
    title: z.string().describe(GraphQLDescriptions.question.properties.title).optional(),
  })
  .superRefine(validateOptions);

export const formQuestionsEditorToolSchema = z.discriminatedUnion('operation', [
  // CREATE
  z.object({
    formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
    operation: z.literal(FormQuestionsOperation.Create).describe(GraphQLDescriptions.question.operations.type),
    question: createQuestionSchema,
  }),
  // UPDATE
  z.object({
    formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
    operation: z.literal(FormQuestionsOperation.Update).describe(GraphQLDescriptions.question.operations.type),
    questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
    question: updateQuestionSchema,
  }),
  // DELETE
  z.object({
    formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
    operation: z.literal(FormQuestionsOperation.Delete).describe(GraphQLDescriptions.question.operations.type),
    questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId),
  }),
]);
