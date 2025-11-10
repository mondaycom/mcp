import { z } from 'zod';
import {
  CreateUpdateMutation,
  CreateUpdateMutationVariables,
  MentionType,
  UpdateMention,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import { createUpdate } from '../create-update-tool/create-update.graphql';

export const mentionSchema = z.object({
  id: z.string().describe('The ID of the entity to mention'),
  type: z.nativeEnum(MentionType).describe('The type of mention: User, Team, Board, or Project'),
});

export const mentionsListSchema = z.array(mentionSchema);

export const createUpdateToolSchema = {
  itemId: z.number().describe('The id of the item to which the update will be added'),
  body: z
    .string()
    .describe('The update text to be created. Do not use @ to mention users, use the mentionsList field instead.'),
  mentionsList: z
    .string()
    .optional()
    .describe(
      'Optional JSON array of mentions in the format: [{"id": "123", "type": "User"}, {"id": "456", "type": "Team"}]. Valid types are: User, Team, Board, Project',
    ),
};

export class CreateUpdateInMondayTool extends BaseMondayApiTool<typeof createUpdateToolSchema> {
  name = 'create_update_in_monday';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Update in Monday',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new update (comment/post) on a monday.com item. Updates can be used to add comments, notes, or discussions to items. You can optionally mention users, teams, or boards in the update.';
  }

  getInputSchema(): typeof createUpdateToolSchema {
    return createUpdateToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createUpdateToolSchema>): Promise<ToolOutputType<never>> {
    let parsedMentionsList: Array<UpdateMention> | undefined;

    if (input.mentionsList) {
      try {
        const parsedJson = JSON.parse(input.mentionsList);
        const validationResult = mentionsListSchema.safeParse(parsedJson);

        if (!validationResult.success) {
          throw new Error(`Invalid mentionsList format: ${validationResult.error.message}`);
        }

        parsedMentionsList = validationResult.data;
      } catch (error) {
        throw new Error(`Invalid mentionsList JSON format: ${(error as Error).message}`);
      }
    }

    try {
      const variables: CreateUpdateMutationVariables = {
        itemId: input.itemId.toString(),
        body: input.body,
        mentionsList: parsedMentionsList,
      };

      const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

      if (!res.create_update?.id) {
        throw new Error('Failed to create update: no update created');
      }

      return {
        content: `Update ${res.create_update.id} successfully created on item ${input.itemId} now we want to show the updated data, so call the full board data tool to get data, and then call the show table tool to show the data from that tool`,
      };
    } catch (error) {
      rethrowWithContext(error, 'create update');
    }
  }
}
