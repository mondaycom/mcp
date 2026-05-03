import { z } from 'zod';
import { UpdateColumnMutation, UpdateColumnMutationVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { updateColumn } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';

export const updateColumnToolSchema = {
  columnId: z.string().describe('The id of the column to update'),
  columnType: z
    .nativeEnum(NonDeprecatedColumnType)
    .describe('The type of the column being updated. Must match the existing column type.'),
  revision: z
    .string()
    .describe(
      'The current revision of the column, obtained from get_board_schema. Used for optimistic concurrency control: if the column changed since you read it, the request will fail and you should re-fetch the latest revision before retrying.',
    ),
  columnTitle: z.string().optional().describe('The new title of the column. If omitted, the title is unchanged.'),
  columnDescription: z
    .string()
    .optional()
    .describe('The new description of the column. If omitted, the description is unchanged.'),
  columnSettings: z
    .string()
    .optional()
    .describe(
      'Type-specific configuration as a JSON string. Use the get_column_type_info tool to fetch the JSON schema for the given column type. If omitted, settings are unchanged.',
    ),
};

export const updateColumnInBoardToolSchema = {
  boardId: z.number().describe('The id of the board containing the column'),
  ...updateColumnToolSchema,
};

export type UpdateColumnToolInput = typeof updateColumnToolSchema | typeof updateColumnInBoardToolSchema;

export class UpdateColumnTool extends BaseMondayApiTool<UpdateColumnToolInput> {
  name = 'update_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Update properties of an existing monday.com column (title, description, settings). Uses optimistic concurrency control via the revision field — fetch the current revision via get_board_schema first, then call this tool. If the update fails because the revision is stale, re-fetch and try again.';
  }

  getInputSchema(): UpdateColumnToolInput {
    if (this.context?.boardId) {
      return updateColumnToolSchema;
    }

    return updateColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<UpdateColumnToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof updateColumnInBoardToolSchema>).boardId;

    const variables: UpdateColumnMutationVariables = {
      boardId: boardId?.toString() ?? '',
      columnId: input.columnId,
      columnType: input.columnType,
      revision: input.revision,
      columnTitle: input.columnTitle,
      columnDescription: input.columnDescription,
      columnSettings:
        typeof input.columnSettings === 'string' ? JSON.parse(input.columnSettings) : input.columnSettings,
    };

    const res = await this.mondayApi.request<UpdateColumnMutation>(updateColumn, variables);

    return {
      content: {
        message: 'Column successfully updated. Use the new revision below for any subsequent update to this column.',
        column_id: res.update_column?.id,
        column_title: res.update_column?.title,
        revision: res.update_column?.revision,
      },
    };
  }
}
