import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  ConnectBoardToObjectSchemaMutation,
  ConnectBoardToObjectSchemaMutationVariables,
  DetachBoardsFromObjectSchemaMutation,
  DetachBoardsFromObjectSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { connectBoardToObjectSchemaMutation } from './connect-board-to-object-schema.graphql';
import { detachBoardsFromObjectSchemaMutation } from './detach-boards-from-object-schema.graphql';

export const manageObjectSchemaBoardConnectionToolSchema = {
  action: z
    .enum(['connect', 'detach'])
    .describe(
      'The operation to perform. ' +
        'connect: attaches a board to an object schema so it inherits the schema column structure. ' +
        'detach: removes one or more boards from their object schema.',
    ),
  boardId: z.string().optional().describe('Required for action=connect. The ID of the board to connect.'),
  boardIds: z.array(z.string()).optional().describe('Required for action=detach. The IDs of the boards to detach.'),
  objectSchemaId: z
    .string()
    .optional()
    .describe('Required for action=connect. The ID of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
  objectSchemaName: z
    .string()
    .optional()
    .describe('Required for action=connect. The name of the object schema. Either objectSchemaId or objectSchemaName must be provided.'),
};

export class ManageObjectSchemaBoardConnectionTool extends BaseMondayApiTool<
  typeof manageObjectSchemaBoardConnectionToolSchema
> {
  name = 'manage_object_schema_board_connection';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage Object Schema Board Connection',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Connect or detach a board from an account-level object schema. ' +
      'connect: attaches a board to an object schema so it inherits the schema column structure. ' +
      'detach: removes one or more boards from their object schema.'
    );
  }

  getInputSchema(): typeof manageObjectSchemaBoardConnectionToolSchema {
    return manageObjectSchemaBoardConnectionToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageObjectSchemaBoardConnectionToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'connect') {
      if (!input.boardId) throw new Error('boardId is required for action=connect');
      if (!input.objectSchemaId && !input.objectSchemaName) {
        throw new Error('Either objectSchemaId or objectSchemaName must be provided for action=connect');
      }

      const variables: ConnectBoardToObjectSchemaMutationVariables = {
        boardId: input.boardId,
        objectSchemaId: input.objectSchemaId,
        objectSchemaName: input.objectSchemaName,
      };

      const res = await this.mondayApi.request<ConnectBoardToObjectSchemaMutation>(
        connectBoardToObjectSchemaMutation,
        variables,
      );

      return {
        content: {
          message: 'Board successfully connected to object schema',
          connection_id: res.connect_board_to_object_schema?.id,
          schema_id: res.connect_board_to_object_schema?.object_schema_id,
        },
      };
    } else {
      if (!input.boardIds?.length) throw new Error('boardIds is required for action=detach');

      const variables: DetachBoardsFromObjectSchemaMutationVariables = {
        boardIds: input.boardIds,
      };

      const res = await this.mondayApi.request<DetachBoardsFromObjectSchemaMutation>(
        detachBoardsFromObjectSchemaMutation,
        variables,
      );

      const results = res.detach_boards_from_object_schema ?? [];
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);

      return {
        content: {
          message: `${succeeded} board(s) successfully detached`,
          results,
          ...(failed.length > 0 && { failures: failed }),
        },
      };
    }
  }
}
