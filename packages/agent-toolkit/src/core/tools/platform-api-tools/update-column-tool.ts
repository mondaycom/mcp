import { z } from 'zod';
import { UpdateColumnMutation, UpdateColumnMutationVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { updateColumn } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { ColumnTypeInfoFetchMode } from './get-column-type-info/get-column-type-info-fetch-mode';
import { NonDeprecatedColumnType } from 'src/utils/types';

export const updateColumnToolSchema = {
  columnId: z.string().describe('The id of the column to update'),
  columnType: z
    .nativeEnum(NonDeprecatedColumnType)
    .describe('The type of the column being updated. Must match the existing column type.'),
  revision: z
    .string()
    .describe(
      'The current revision of the column. Get it from get_board_schema (preferred) or get_board_info. Used for optimistic concurrency control — if the column changed since you read it, the request fails and you must re-fetch the latest revision before retrying. After a successful update_column, use the new revision from the response for any further update to this column, not the one you started with.',
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
      'Type-specific configuration as a JSON string. If omitted, settings are unchanged. Shape depends on columnType — see tool description for how to obtain it.',
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
    return (
      'Update properties of an existing monday.com column (title, description, settings). ' +
      '[REQUIRED PRECONDITION]: Uses optimistic concurrency control via the revision field — fetch the column id, type, and current revision via get_board_schema first (preferred), or get_board_info if you already have it, then call this tool. If the update fails because the revision is stale, re-fetch and try again. After a successful update, use the new revision returned in the response for any further update to this column, not the one you started with. ' +
      `[REQUIRED PRECONDITION]: If you are changing columnSettings, also call get_column_type_info with fetchMode "${ColumnTypeInfoFetchMode.Schema}" for that column type first to learn the valid settings structure. columnSettings is the flat payload for that column type (e.g. {"labels": [...]}) — not get_board_info's column.settings object copied as-is, and not wrapped again as {"settings": {"labels": [...]}}. ` +
      'To edit existing status or dropdown labels (rename, recolor, or reorder): first call get_board_info to read that column\'s current settings.labels, where each existing label\'s id lives. Editing an existing label requires sending its id in that label\'s entry — omitting it fails validation, since only a brand-new label can omit id. Status labels need the full label shape (id, label, color, index, and so on), not just a renamed string. Never invent an id — reuse the ids from get_board_info and add new labels without one. Flow: get_board_info for the revision and current settings.labels with ids, get_column_type_info (schema mode) for the valid shape, then build columnSettings.labels reusing existing ids and adding new labels without id.'
    );
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
