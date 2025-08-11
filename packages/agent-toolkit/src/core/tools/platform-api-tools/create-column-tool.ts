import { z } from 'zod';
import {
  ColumnType,
  CreateColumnMutation,
  CreateColumnMutationVariables,
} from '../../../monday-graphql/generated/graphql';
import { createColumn } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createColumnToolSchema = {
  columnType: z.nativeEnum(ColumnType).describe('The type of the column to be created'),
  columnTitle: z.string().describe('The title of the column to be created'),
  columnDescription: z.string().optional().describe('The description of the column to be created'),
  columnSettings: z
    .any()
    .optional()
    .describe(
      "Column-specific configuration settings. For API version 2025-10+: Use the get_column_type_info tool first to get the JSON schema for the specific column type, then structure this field according to that schema as an object. For older API versions: Provide default values as an array of strings (relevant only for 'status' or 'dropdown' column types).",
    ),
};

export const createColumnInBoardToolSchema = {
  boardId: z.number().describe('The id of the board to which the new column will be added'),
  ...createColumnToolSchema,
};

export type CreateColumnToolInput = typeof createColumnToolSchema | typeof createColumnInBoardToolSchema;

export class CreateColumnTool extends BaseMondayApiTool<CreateColumnToolInput> {
  name = 'create_column';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Column',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new column in a monday.com board';
  }

  getInputSchema(): CreateColumnToolInput {
    if (this.context?.boardId) {
      return createColumnToolSchema;
    }

    return createColumnInBoardToolSchema;
  }

  protected async executeInternal(input: ToolInputType<CreateColumnToolInput>): Promise<ToolOutputType<never>> {
    const boardId = this.context?.boardId ?? (input as ToolInputType<typeof createColumnInBoardToolSchema>).boardId;

    const apiVersion = this.mondayApi.apiVersion;
    const useNewApiFormat = (apiVersion && apiVersion >= '2025-10') || apiVersion === 'dev';

    let variables: CreateColumnMutationVariables;

    if (useNewApiFormat) {
      variables = {
        boardId: boardId.toString(),
        columnType: input.columnType,
        columnTitle: input.columnTitle,
        columnDescription: input.columnDescription,
        columnSettings: typeof input.columnSettings === 'string' ? JSON.parse(input.columnSettings) : input.columnSettings,
      };
    } else {
      let columnSettings: string | undefined;
      if (input.columnSettings && input.columnType === ColumnType.Status) {
        columnSettings = JSON.stringify({
          labels: Object.fromEntries(input.columnSettings.map((label: string, i: number) => [String(i + 1), label])),
        });
      } else if (input.columnSettings && input.columnType === ColumnType.Dropdown) {
        columnSettings = JSON.stringify({
          settings: {
            labels: input.columnSettings.map((label: string, i: number) => ({ id: i + 1, name: label })),
          },
        });
      }
  
      variables = {
        boardId: boardId.toString(),
        columnType: input.columnType,
        columnTitle: input.columnTitle,
        columnDescription: input.columnDescription,
        columnSettings,
      };
    }

    const res = await this.mondayApi.request<CreateColumnMutation>(createColumn, variables);

    return {
      content: `Column ${res.create_column?.id} successfully created`,
    };
  }
}
