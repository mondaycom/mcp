import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  ColumnActiveStateAction,
  SetObjectSchemaColumnActiveStateMutation,
  SetObjectSchemaColumnActiveStateMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { setObjectSchemaColumnActiveStateMutation } from './set-object-schema-column-active-state-tool.graphql';

export const setObjectSchemaColumnActiveStateToolSchema = {
  action: z
    .enum(['deactivate', 'reactivate'])
    .describe(
      'The operation to perform on the column. ' +
        'deactivate: soft-disables the column. It is marked inactive but not deleted. Reversible. ' +
        'reactivate: re-enables a previously deactivated column.',
    ),
  objectSchemaId: z
    .string()
    .optional()
    .describe('The ID of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
  objectSchemaName: z
    .string()
    .optional()
    .describe('The name of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
  columnId: z.string().describe('The ID of the column to deactivate or reactivate.'),
};

export class SetObjectSchemaColumnActiveStateTool extends BaseMondayApiTool<typeof setObjectSchemaColumnActiveStateToolSchema> {
  name = 'set_object_schema_column_active_state';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Set Object Schema Column Active State',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Set the active state of a column on an account-level object schema. ' +
      'deactivate: soft-disables the column, preventing it from being used on new boards. The column is not deleted and can be restored. ' +
      'reactivate: restores a previously deactivated column, making it available again.'
    );
  }

  getInputSchema(): typeof setObjectSchemaColumnActiveStateToolSchema {
    return setObjectSchemaColumnActiveStateToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof setObjectSchemaColumnActiveStateToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.objectSchemaId && !input.objectSchemaName) {
      throw new Error('Either objectSchemaId or objectSchemaName must be provided');
    }

    const actionMap: Record<string, ColumnActiveStateAction> = {
      deactivate: ColumnActiveStateAction.Deactivate,
      reactivate: ColumnActiveStateAction.Reactivate,
    };

    const variables: SetObjectSchemaColumnActiveStateMutationVariables = {
      objectSchemaId: input.objectSchemaId,
      objectSchemaName: input.objectSchemaName,
      columnId: input.columnId,
      action: actionMap[input.action],
    };

    const res = await this.mondayApi.request<SetObjectSchemaColumnActiveStateMutation>(
      setObjectSchemaColumnActiveStateMutation,
      variables,
    );

    return {
      content: {
        message: `Column successfully ${input.action}d on object schema "${res.set_object_schema_column_active_state?.name}"`,
        schema_id: res.set_object_schema_column_active_state?.id,
        schema_name: res.set_object_schema_column_active_state?.name,
        revision: res.set_object_schema_column_active_state?.revision,
      },
    };
  }
}
