import { z } from 'zod';
import {
  CreateUpdateMutation,
  CreateUpdateMutationVariables,
  MentionType,
  UpdateMention,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { createUpdate } from './create-update.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';

export const mentionSchema = z.object({
  id: z.string().describe('The ID of the entity to mention'),
  type: z.nativeEnum(MentionType).describe('The type of mention: User, Team, Board, or Project'),
});

export const mentionsListSchema = z.array(mentionSchema);

export const createUpdateToolSchema = {
  itemId: z.number().describe('The id of the item to which the update will be added'),
  body: z
    .string()
    .describe(
      'The update text to be created. Use html tags to format the text, dont use markdown.',
    ),
  mentionsList: z
    .string()
    .optional()
    .describe(
      'Optional JSON array of mentions. This field is currently unsupported by monday.com create_update and will return a validation error when provided.',
    ),
  parentId: z
    .number()
    .optional()
    .describe('The ID of the update to reply to. Use this parameter when you want to reply on an existing update leave it empty if you want to create a new update'),
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
    return 'Create a new update (comment/post) on a monday.com item. Updates can be used to add comments, notes, or discussions to items. You can also reply to an existing update by using the parentId parameter. Note: mentionsList is currently unsupported by the monday.com create_update API.';
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

      if (parsedMentionsList.length > 0) {
        throw new Error('mentionsList is currently unsupported by the monday.com create_update API');
      }
    }

    try {
      const variables: CreateUpdateMutationVariables = {
        itemId: input.itemId.toString(),
        body: input.body,
        parentId: input.parentId?.toString(),
      };

      const res = await this.mondayApi.request<CreateUpdateMutation>(createUpdate, variables);

      if (!res.create_update?.id) {
        throw new Error('Failed to create update: no update created');
      }

      return {
        content: { message: `Update ${res.create_update.id} created on item ${input.itemId}`, update_id: res.create_update.id, item_id: input.itemId, item_name: res.create_update.item?.name, item_url: res.create_update.item?.url },
      };
    } catch (error) {
      rethrowWithContext(error, 'create update');
    }
  }
}
