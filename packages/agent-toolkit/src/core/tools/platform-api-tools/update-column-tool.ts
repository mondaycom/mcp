import { z } from 'zod';
import { updateColumn, getBoardSchema } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { NonDeprecatedColumnType } from 'src/utils/types';
import { INVALID_TOOL_ARGS_CODE, rethrowWithContext, ToolValidationError } from '../../../utils/error.utils';
import {
  fetchColumnRevision,
  isRevisionMismatchError,
  parseColumnSettings,
  sanitizeColumnSettings,
} from './update-column-tool.helpers';

type UpdateColumnMutationVariables = {
  boardId: string;
  columnId: string;
  columnType: string;
  revision: string;
  columnTitle?: string;
  columnDescription?: string;
  columnSettings?: Record<string, unknown>;
};

type UpdateColumnMutation = {
  update_column?: {
    id?: string | null;
    title?: string | null;
    revision?: string | null;
  } | null;
};

export const updateColumnToolSchema = {
  columnId: z.string().describe('The id of the column to update'),
  columnType: z
    .nativeEnum(NonDeprecatedColumnType)
    .describe('The type of the column being updated. Must match the existing column type.'),
  revision: z
    .string()
    .describe(
      'Required. Current column revision from get_board_schema. Used for optimistic concurrency control — if the column changed since you read it, the request fails with REVISION_MISMATCH and you must re-fetch the latest revision before retrying.',
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
      'Type-specific configuration as a JSON string. Use get_column_type_info for the JSON schema. If omitted, settings are unchanged. For status columns: fetch label ids from get_board_schema (not from item column values); existing labels must include id, new labels must omit id; descriptions are limited to 80 characters. For dropdown columns: do not resend the full labels list when adding one label — the tool converts new labels to MODIFY_LABELS actions.',
    ),
  itemId: z
    .union([z.number(), z.string()])
    .optional()
    .describe('Do not use — update_column changes column definitions, not item values. Use change_item_column_values instead.'),
  value: z
    .unknown()
    .optional()
    .describe('Do not use — update_column changes column definitions, not item values. Use change_item_column_values instead.'),
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
      'Do NOT use this tool to change item column values — use change_item_column_values for that. ' +
      'Always call get_board_schema first to obtain the current revision and label ids. ' +
      'Revision is required for optimistic concurrency control. If the update fails with REVISION_MISMATCH, re-fetch the revision and retry once. ' +
      'For status labels: use label ids from get_board_schema for existing labels; new labels must not include id. Do not reuse ids from item column values. ' +
      'Keep status label descriptions under 80 characters. ' +
      'For dropdown labels: add labels via MODIFY_LABELS actions — do not resend the entire labels list unless you intend to replace all labels.'
    );
  }

  getInputSchema(): UpdateColumnToolInput {
    if (this.context?.boardId) {
      return updateColumnToolSchema;
    }

    return updateColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<UpdateColumnToolInput>): Promise<ToolOutputType<never>> {
    const itemValueInput = input as ToolInputType<typeof updateColumnInBoardToolSchema> & {
      itemId?: number | string;
      value?: unknown;
    };
    if (itemValueInput.itemId !== undefined || itemValueInput.value !== undefined) {
      throw new ToolValidationError(
        'update_column modifies column definitions (title, description, settings), not item values. Use change_item_column_values with itemId and columnValues instead.',
        INVALID_TOOL_ARGS_CODE,
      );
    }

    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof updateColumnInBoardToolSchema>).boardId;
    const boardIdString = boardId?.toString() ?? '';

    let parsedSettings: Record<string, unknown> | undefined;
    try {
      parsedSettings = parseColumnSettings(input.columnSettings);
    } catch (error) {
      rethrowWithContext(error, 'update column');
    }

    const { settings: sanitizedSettings, warnings } = sanitizeColumnSettings(input.columnType, parsedSettings);

    const executeUpdate = async (currentRevision: string) => {
      const variables: UpdateColumnMutationVariables = {
        boardId: boardIdString,
        columnId: input.columnId,
        columnType: input.columnType,
        revision: currentRevision,
        columnTitle: input.columnTitle,
        columnDescription: input.columnDescription,
        columnSettings: sanitizedSettings,
      };

      return this.mondayApi.request<UpdateColumnMutation>(updateColumn, variables);
    };

    try {
      let res: UpdateColumnMutation;
      try {
        res = await executeUpdate(input.revision);
      } catch (error) {
        if (!isRevisionMismatchError(error)) {
          throw error;
        }

        const freshRevision = await fetchColumnRevision(
          (query, variables) => this.mondayApi.request(query, variables),
          getBoardSchema,
          boardIdString,
          input.columnId,
        );
        res = await executeUpdate(freshRevision);
        warnings.push('Retried update_column after REVISION_MISMATCH using a fresh revision.');
      }

      return {
        content: {
          message: [
            'Column successfully updated. Use the new revision below for any subsequent update to this column.',
            ...warnings,
          ].join(' '),
          column_id: res.update_column?.id,
          column_title: res.update_column?.title,
          revision: res.update_column?.revision,
          ...(warnings.length > 0 ? { warnings } : {}),
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'update column');
    }
  }
}
