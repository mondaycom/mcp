import { z } from 'zod';
import { CreateUpdateMutation, CreateUpdateMutationVariables, MentionType } from '../../../monday-graphql/generated/graphql';
import { createUpdate } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const createUpdateToolSchema = {
  itemId: z.number().describe('The id of the item to which the update will be added'),
  body: z.string().describe("The update to be created, must be relevant to the user's request"),
  mentionsList: z
    .array(
      z.object({
        id: z.number().describe('The ID of the mentioned entity'),
        type: z.nativeEnum(MentionType).describe('The type of entity being mentioned'),
      })
    )
    .optional()
    .describe('Optional list of entities to mention at the end of an update'),
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
    const variables: CreateUpdateMutationVariables = {
      itemId: input.itemId.toString(),
      body: input.body,
      mentionsList: input.mentionsList?.map(mention => ({
        id: mention.id.toString(),
        type: mention.type as MentionType,
      })),
    };

    const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

    return {
      content: `Update ${res.create_update?.id} successfully created on item ${input.itemId}`,
    };
  }
}
