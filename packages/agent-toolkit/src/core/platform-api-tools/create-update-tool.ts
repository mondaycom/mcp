import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { createUpdate } from '../../monday-graphql/queries.graphql';
import { CreateUpdateMutation, CreateUpdateMutationVariables } from '../../monday-graphql/generated/graphql';

export const createUpdateToolShape = {
  itemId: z.number().optional().describe('The id of the item to which the update will be added. Required if parentId is not provided.'),
  body: z.string().describe("The update to be created, must be relevant to the user's request"),
  parentId: z.string().optional().describe('The id of the parent post to reply to. If provided, the update will be a reply to this post. Required if itemId is not provided.'),
};

export const createUpdateToolSchema = z.object(createUpdateToolShape);

export class CreateUpdateTool extends BaseMondayApiTool<typeof createUpdateToolShape> {
  name = 'create_update';
  type = ToolType.MUTATION;

  getDescription(): string {
    return 'Create a new update in a monday.com board';
  }

  getInputSchema(): typeof createUpdateToolShape {
    return createUpdateToolShape;
  }

  async execute(input: ToolInputType<typeof createUpdateToolShape>): Promise<ToolOutputType<never>> {
    if (input.itemId === undefined && input.parentId === undefined) {
      throw new Error("Validation Error: Either itemId or parentId must be provided.");
    }

    const variables: CreateUpdateMutationVariables = {
      body: input.body,
    };

    if (input.itemId !== undefined) {
      variables.itemId = input.itemId.toString();
    }

    if (input.parentId !== undefined) {
      variables.parentId = input.parentId;
    }

    const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

    let message = `Update ${res.create_update?.id} successfully created.`;
    if (input.itemId !== undefined) {
      message += ` On item ${input.itemId}`;
    }

    return {
      content: message,
    };
  }
}
