import { z } from 'zod';
import { CreateUpdateMutation, CreateUpdateMutationVariables, UpdateMention } from '../../../monday-graphql/generated/graphql';
import { createUpdate } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createUpdateToolSchema = {
  itemId: z.number().describe('The id of the item to which the update will be added'),
  body: z.string().describe("The update to be created, must be relevant to the user's request"),
  mentionsList: z
    .string()
    .optional()
    .describe('Optional JSON string containing an array of mention objects with "id" (string) and "type" (MentionType enum value). Example: \'[{"id": "123", "type": "User"}, {"id": "456", "type": "Team"}]\''),
};

export class CreateUpdateTool extends BaseMondayApiTool<typeof createUpdateToolSchema> {
  name = 'create_update';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Update',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new update in a monday.com board';
  }

  getInputSchema(): typeof createUpdateToolSchema {
    return createUpdateToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createUpdateToolSchema>): Promise<ToolOutputType<never>> {
    let parsedMentionsList;
    if (input.mentionsList) {
      try {
        parsedMentionsList = JSON.parse(input.mentionsList) as Array<UpdateMention>;
      } catch (error) {
        throw new Error(`Invalid mentionsList JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const variables: CreateUpdateMutationVariables = {
      itemId: input.itemId.toString(),
      body: input.body,
      mentionsList: parsedMentionsList,
    };

    const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

    return {
      content: `Update ${res.create_update?.id} successfully created on item ${input.itemId}`,
    };
  }
}
