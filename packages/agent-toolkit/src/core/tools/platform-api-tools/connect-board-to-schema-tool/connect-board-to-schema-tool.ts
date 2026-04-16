import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  ConnectBoardToSchemaMutation,
  ConnectBoardToSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { connectBoardToSchemaMutationDev } from './connect-board-to-schema-tool.graphql.dev';

export const connectBoardToSchemaToolSchema = {
  boardId: z.string().describe('The ID of the board to connect to the schema.'),
  schemaId: z
    .string()
    .optional()
    .describe('The ID of the schema to connect the board to. Either schemaId or schemaName must be provided.'),
  schemaName: z
    .string()
    .optional()
    .describe('The name of the schema to connect the board to. Either schemaId or schemaName must be provided.'),
};

export class ConnectBoardToSchemaTool extends BaseMondayApiTool<typeof connectBoardToSchemaToolSchema> {
  name = 'connect_board_to_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Connect Board to Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Connect a board to an account-level schema. Provide either schemaId or schemaName to identify the schema.';
  }

  getInputSchema(): typeof connectBoardToSchemaToolSchema {
    return connectBoardToSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof connectBoardToSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.schemaId && !input.schemaName) {
      throw new Error('Either schemaId or schemaName must be provided');
    }

    const variables: ConnectBoardToSchemaMutationVariables = {
      boardId: input.boardId,
      schemaId: input.schemaId,
      schemaName: input.schemaName,
    };

    const res = await this.mondayApi.request<ConnectBoardToSchemaMutation>(
      connectBoardToSchemaMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Board successfully connected to schema`,
        connection_id: res.connect_board_to_schema?.id,
        schema_id: res.connect_board_to_schema?.entity_id,
      },
    };
  }
}
