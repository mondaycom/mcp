import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import {
  DetachBoardsFromSchemaMutation,
  DetachBoardsFromSchemaMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { detachBoardsFromSchemaMutationDev } from './detach-boards-from-schema-tool.graphql.dev';

export const detachBoardsFromSchemaToolSchema = {
  boardIds: z.array(z.string()).describe('List of board IDs to detach from their schemas.'),
};

export class DetachBoardsFromSchemaTool extends BaseMondayApiTool<typeof detachBoardsFromSchemaToolSchema> {
  name = 'detach_boards_from_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Detach Boards from Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Detach one or more boards from their account-level schemas.';
  }

  getInputSchema(): typeof detachBoardsFromSchemaToolSchema {
    return detachBoardsFromSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof detachBoardsFromSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: DetachBoardsFromSchemaMutationVariables = {
      boardIds: input.boardIds,
    };

    const res = await this.mondayApi.request<DetachBoardsFromSchemaMutation>(
      detachBoardsFromSchemaMutationDev,
      variables,
      { versionOverride: 'dev' },
    );

    const results = res.detach_boards_from_schema ?? [];
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    return {
      content: {
        message: `Detached ${succeeded}/${results.length} board(s) from schema`,
        results,
        ...(failed.length > 0 && { failures: failed }),
      },
    };
  }
}
