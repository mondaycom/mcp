import { z } from 'zod';
import { GraphQLDescriptions } from '../workforms.consts';
import { BoardKind } from '../../../../../monday-graphql/generated/graphql/graphql';

export const createFormToolSchema = {
  destination_workspace_id: z.string(),
  destination_folder_id: z.string().optional(),
  destination_folder_name: z.string().optional(),
  board_kind: z.nativeEnum(BoardKind).optional(),
  destination_name: z.string().optional().describe(GraphQLDescriptions.form.args.destinationName),
  board_owner_ids: z.array(z.string()).optional(),
  board_owner_team_ids: z.array(z.string()).optional(),
  board_subscriber_ids: z.array(z.string()).optional().describe(GraphQLDescriptions.form.args.boardSubscriberIds),
  board_subscriber_teams_ids: z
    .array(z.string())
    .optional()
    .describe(GraphQLDescriptions.form.args.boardSubscriberTeamsIds),
};
