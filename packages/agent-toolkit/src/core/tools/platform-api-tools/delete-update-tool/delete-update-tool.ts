import { z } from 'zod';
import { DeleteUpdateMutation, DeleteUpdateMutationVariables } from 'src/monday-graphql/generated/graphql/graphql';
import { deleteUpdate } from 'src/monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';

export const deleteUpdateToolSchema = {
  id: z.number().describe('The unique identifier of the update to delete'),
};

export class DeleteUpdateTool extends BaseMondayApiTool<typeof deleteUpdateToolSchema> {
  name = 'delete_update';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete Update',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Delete an update (comment/post) from a monday.com item.';
  }

  getInputSchema(): typeof deleteUpdateToolSchema {
    return deleteUpdateToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof deleteUpdateToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: DeleteUpdateMutationVariables = {
        id: input.id.toString(),
      };

      const res = await this.mondayApi.request<DeleteUpdateMutation>(deleteUpdate, variables);

      if (!res.delete_update?.id) {
        throw new Error('Failed to delete update: update not found or already deleted');
      }

      return {
        content: { message: `Update ${res.delete_update.id} successfully deleted`, update_id: res.delete_update.id },
      };
    } catch (error) {
      rethrowWithContext(error, 'delete update');
    }
  }
}
