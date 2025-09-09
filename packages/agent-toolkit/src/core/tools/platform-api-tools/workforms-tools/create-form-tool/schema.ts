import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { BoardKind } from '../../../../../monday-graphql/generated/graphql';

export const createFormToolSchema = {
  destination_workspace_id: z.string().describe(GraphQLDescriptions.form.args.destinationWorkspaceId),
  destination_folder_id: z.string().optional().describe(GraphQLDescriptions.form.args.destinationFolderId),
  destination_folder_name: z.string().optional().describe(GraphQLDescriptions.form.args.destinationFolderName),
  board_kind: z.nativeEnum(BoardKind).optional().describe(GraphQLDescriptions.form.args.boardKind),
  destination_name: z.string().optional().describe(GraphQLDescriptions.form.args.destinationName),
  board_owner_ids: z.array(z.string()).optional().describe(GraphQLDescriptions.form.args.boardOwnerIds),
  board_owner_team_ids: z.array(z.string()).optional().describe(GraphQLDescriptions.form.args.boardOwnerTeamIds),
  board_subscriber_ids: z.array(z.string()).optional().describe(GraphQLDescriptions.form.args.boardSubscriberIds),
  board_subscriber_teams_ids: z
    .array(z.string())
    .optional()
    .describe(GraphQLDescriptions.form.args.boardSubscriberTeamsIds),
};
