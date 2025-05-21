import { z } from 'zod';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { createUpdate } from '../../monday-graphql/queries.graphql';
import { CreateUpdateMutation, CreateUpdateMutationVariables } from '../../monday-graphql/generated/graphql';

export const MentionTypeEnum = z.enum(['User']);

export const UpdateMentionInputSchema = z.object({
  id: z.string().describe('The user id.'),
  type: MentionTypeEnum.describe('The type of the mention, always "User".'),
});
 
export const createUpdateToolShape = {
  item_id: z.number().optional().describe('The id of the item to which the update will be added. Required if parent_id is not provided. You can get the item id from the fetch-updates tool.'),
  body: z.string().describe("The update to be created, must be relevant to the user's request"),
  parent_id: z.string().optional().describe('The id of the parent post to reply to. If provided, the update will be a reply to this post. Required if item_id is not provided.'),
  mentions: z.array(UpdateMentionInputSchema).optional().describe('Mentions in the update. E.g., [{type: "User", id: "123"}]'),
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
    if (input.item_id === undefined && input.parent_id === undefined) {
      throw new Error("Validation Error: Either itemId or parentId must be provided.");
    }
    
    const variables: CreateUpdateMutationVariables = {
      body: input.body,
    };

    if (input.item_id !== undefined) {
      variables.itemId = input.item_id.toString();
    }

    if (input.parent_id !== undefined) {
      variables.parentId = input.parent_id;
    }

    if (input.mentions !== undefined && input.mentions.length > 0) {
      variables.mentions = input.mentions;
      variables.embed_mentions_in_body = true;
    }

    const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

    let message = `Update ${res.create_update?.id} successfully created.`;
    if (input.item_id !== undefined) {
      message += ` On item ${input.item_id}`;
    }

    return {
      content: message,
    };
  }
}
