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
    .string()
    .optional()
    .describe(
      'Column-specific configuration settings as a JSON string. Use the get_column_type_info tool to fetch the JSON schema for the given column type.',
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

    const variables: CreateColumnMutationVariables = {
      boardId: boardId.toString(),
      columnType: input.columnType,
      columnTitle: input.columnTitle,
      columnDescription: input.columnDescription,
      columnSettings: typeof input.columnSettings === 'string' ? JSON.parse(input.columnSettings) : input.columnSettings,
    };

    const res = await this.mondayApi.request<CreateColumnMutation>(createColumn, variables);

    return {
      content: `Column ${res.create_column?.id} successfully created`,
    };
  }
}
