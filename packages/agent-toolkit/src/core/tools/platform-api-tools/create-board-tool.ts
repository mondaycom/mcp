import { z } from 'zod';
import {
  BoardKind,
} from '../../../monday-graphql/generated/graphql/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

const createBoardMutation = `
  mutation createBoard(
    $boardKind: BoardKind!
    $boardName: String!
    $boardDescription: String
    $workspaceId: ID
    $boardOwnerIds: [ID!]
    $useMlsTemplate: Boolean
    $useDatasetTemplate: Boolean
  ) {
    create_board(
      board_kind: $boardKind
      board_name: $boardName
      description: $boardDescription
      workspace_id: $workspaceId
      board_owner_ids: $boardOwnerIds
      use_mls_template: $useMlsTemplate
      use_dataset_template: $useDatasetTemplate
      empty: true
    ) {
      id
      name
      url
    }
  }
`;

type CreateBoardMutationResponse = {
  create_board?: {
    id: string;
    name: string;
    url: string;
  } | null;
};

export const createBoardToolSchema = {
  boardName: z.string().describe('The name of the board to create'),
  boardKind: z.nativeEnum(BoardKind).default(BoardKind.Public).describe('The kind of board to create'),
  boardDescription: z.string().optional().describe('The description of the board to create'),
  workspaceId: z.string().optional().describe('The ID of the workspace to create the board in'),
  boardOwnerIds: z.array(z.string()).optional().describe('Optional list of user IDs to set as board owners'),
  useMlsTemplate: z.boolean().optional().describe('If true, creates the board from the MLS template'),
  useDatasetTemplate: z.boolean().optional().describe('If true, creates the board from the dataset template'),
};

export class CreateBoardTool extends BaseMondayApiTool<typeof createBoardToolSchema, never> {
  name = 'create_board';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Board',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a monday.com board';
  }

  getInputSchema(): typeof createBoardToolSchema {
    return createBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createBoardToolSchema>): Promise<ToolOutputType<never>> {
    const variables = {
      boardName: input.boardName,
      boardKind: input.boardKind,
      boardDescription: input.boardDescription,
      workspaceId: input.workspaceId,
      ...(input.boardOwnerIds !== undefined ? { boardOwnerIds: input.boardOwnerIds } : {}),
      ...(input.useMlsTemplate !== undefined ? { useMlsTemplate: input.useMlsTemplate } : {}),
      ...(input.useDatasetTemplate !== undefined ? { useDatasetTemplate: input.useDatasetTemplate } : {}),
    };

    const res = await this.mondayApi.request<CreateBoardMutationResponse>(createBoardMutation, variables);

    return {
      content: { message: `Board ${res.create_board?.id} successfully created`, board_id: res.create_board?.id, board_name: res.create_board?.name, board_url: res.create_board?.url },
    };
  }
}
