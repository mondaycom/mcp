import { z } from 'zod';
import { restoreItem } from 'src/monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const restoreItemToolSchema = {
  itemId: z.number().describe('The id of the item to restore'),
};

// Hand-written in lieu of running graphql-codegen against `restoreItem` in queries.graphql.ts.
// `restore_item` is an internal mutation (visible: false), so it is absent from the public
// schema.graphql that codegen introspects and cannot be imported from
// `src/monday-graphql/generated/graphql/graphql.ts` the way DeleteItemMutation is.
interface RestoreItemMutationVariables {
  itemId: string;
}
interface RestoreItemMutation {
  restore_item?: { id: string; name?: string | null } | null;
}

export class RestoreItemTool extends BaseMondayApiTool<typeof restoreItemToolSchema, never> {
  name = 'restore_item';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Restore Item',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Restore a previously deleted monday.com item from the recycle bin, placing it back in its original board and group.';
  }

  getInputSchema(): typeof restoreItemToolSchema {
    return restoreItemToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof restoreItemToolSchema>): Promise<ToolOutputType<never>> {
    const variables: RestoreItemMutationVariables = {
      itemId: input.itemId.toString(),
    };

    const res = await this.mondayApi.request<RestoreItemMutation>(restoreItem, variables);

    return {
      content: {
        message: `Item ${res.restore_item?.id} successfully restored`,
        item_id: res.restore_item?.id,
      },
    };
  }
}
