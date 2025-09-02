import { z } from 'zod';
import { GraphQLDescriptions } from './workforms.consts';
import { FormQuestionsOperation } from './workforms.types';
import {
  FormQuestionSelectDisplay,
  FormQuestionSelectOrderByOptions,
  FormQuestionType,
  FormQuestionPrefillSources,
} from 'src/monday-graphql/generated/graphql';
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
      labelLimitCount: z.number().describe(GraphQLDescriptions.questionSettings.properties.labelLimitCount).optional(),
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
  operation: z.nativeEnum(FormQuestionsOperation).describe(GraphQLDescriptions.question.operations.type),
  formToken: z.string().describe(GraphQLDescriptions.commonArgs.formToken),
  questionId: z.string().describe(GraphQLDescriptions.commonArgs.questionId).optional(),
  question: questionSchema.describe(GraphQLDescriptions.question.operations.question).optional(),
};
