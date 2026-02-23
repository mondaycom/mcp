import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import { getItemUpdates, getBoardUpdates } from './get-updates.graphql';

export const getUpdatesToolSchema = {
  objectId: z.string().describe('The ID of the item or board to get updates from'),
  objectType: z.enum(['Item', 'Board']).describe('Type of object for which objectId was provided'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe('Number of updates per page (default: 25, max: 100)'),
  page: z.number().min(1).optional().default(1).describe('Page number for pagination (default: 1)'),
  includeReplies: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include update replies in the response'),
  includeAssets: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include file attachments in the response'),
};

export class GetUpdatesTool extends BaseMondayApiTool<typeof getUpdatesToolSchema> {
  name = 'get_updates';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Updates',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Get updates (comments/posts) from a monday.com item or board. ' +
      'Specify objectId and objectType (Item or Board) to retrieve updates. ' +
      'Returns update text, creator info, timestamps, and optionally replies and assets.'
    );
  }

  getInputSchema(): typeof getUpdatesToolSchema {
    return getUpdatesToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getUpdatesToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables = {
        limit: input.limit ?? 25,
        page: input.page ?? 1,
        includeReplies: input.includeReplies ?? false,
        includeAssets: input.includeAssets ?? false,
      };

      let res: any;

      if (input.objectType === 'Item') {
        res = await this.mondayApi.request(getItemUpdates, { ...variables, itemId: input.objectId });
      } else {
        res = await this.mondayApi.request(getBoardUpdates, { ...variables, boardId: input.objectId });
      }

      const updates = input.objectType === 'Item' ? res.items?.[0]?.updates : res.boards?.[0]?.updates;

      if (!updates || updates.length === 0) {
        return {
          content: `No updates found for ${input.objectType.toLowerCase()} with id ${input.objectId}`,
        };
      }

      const formattedUpdates = updates.map((update: any) => {
        const formattedUpdate: any = {
          id: update.id,
          body: update.body,
          text_body: update.text_body,
          created_at: update.created_at,
          updated_at: update.updated_at,
          creator: update.creator
            ? {
                id: update.creator.id,
                name: update.creator.name,
              }
            : null,
          item_id: update.item_id,
        };

        if (input.includeReplies && update.replies) {
          formattedUpdate.replies = update.replies.map((reply: any) => {
            const formattedReply: any = {
              id: reply.id,
              body: reply.body,
              text_body: reply.text_body,
              created_at: reply.created_at,
              updated_at: reply.updated_at,
              creator: reply.creator
                ? {
                    id: reply.creator.id,
                    name: reply.creator.name,
                  }
                : null,
            };

            return formattedReply;
          });
        }

        if (input.includeAssets && update.assets) {
          formattedUpdate.assets = update.assets.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            url: asset.url,
            file_extension: asset.file_extension,
            file_size: asset.file_size,
            created_at: asset.created_at,
          }));
        }

        return formattedUpdate;
      });

      const result = {
        updates: formattedUpdates,
        pagination: {
          page: input.page ?? 1,
          limit: input.limit ?? 25,
          count: formattedUpdates.length,
        },
      };

      return {
        content: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      rethrowWithContext(error, 'get updates');
    }
  }
}
