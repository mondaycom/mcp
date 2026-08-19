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
    .optional()
    .describe(
      'The current revision of the column. Optional — if omitted, the tool fetches the latest revision from get_board_schema automatically. Required for optimistic concurrency control when you already have a fresh revision.',
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
      'Type-specific configuration as a JSON string. Use get_column_type_info for the JSON schema for the given column type. If omitted, settings are unchanged. For status columns, label descriptions are limited to 80 characters. For dropdown columns, prefer adding labels without resending the full labels list — the tool converts new labels to safe MODIFY_LABELS actions.',
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
      'Revision is optional; the tool auto-fetches it when omitted and retries once on REVISION_MISMATCH. ' +
      'For status label updates, keep label descriptions under 80 characters. ' +
      'For dropdown label updates, send only new labels or use MODIFY_LABELS actions — do not resend the entire labels list unless you intend to replace all labels.'
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

    let revision = input.revision;
    if (!revision) {
      revision = await fetchColumnRevision(
        (query, variables) => this.mondayApi.request(query, variables),
        getBoardSchema,
        boardIdString,
        input.columnId,
      );
    }

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
        res = await executeUpdate(revision);
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
