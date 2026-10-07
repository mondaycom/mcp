import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';
import { getItemUpdates, getItemsUpdates, getBoardUpdates } from './get-updates.graphql';
import {
  GetBoardUpdatesQuery,
  GetItemsUpdatesQuery,
  GetItemUpdatesQuery,
} from 'src/monday-graphql/generated/graphql/graphql';

export enum UpdateObjectType {
  Item = 'Item',
  Board = 'Board',
}

export const MAX_OBJECT_IDS = 25;
export const MAX_TEXT_BODY_LENGTH = 2000;

export const getUpdatesToolSchema = {
  objectId: z.string().describe('The ID of the item or board to get updates from'),
  objectIds: z
    .array(z.string())
    .min(1)
    .max(MAX_OBJECT_IDS)
    .optional()
    .describe(
      `Item IDs to get updates from in one request, up to ${MAX_OBJECT_IDS}. Item objectType only. When set, objectId is ignored and limit and page apply to each item.`,
    ),
  objectType: z.enum([UpdateObjectType.Item, UpdateObjectType.Board]).describe('Type of object for which objectId was provided'),
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
  fromDate: z
    .string()
    .optional()
    .describe('Start of date range filter (e.g. "2025-01-01" or "2025-01-01T00:00:00Z"). Must be used together with toDate. Only supported for Board objectType.'),
  toDate: z
    .string()
    .optional()
    .describe('End of date range filter (e.g. "2025-06-01" or "2025-06-01T23:59:59Z"). Must be used together with fromDate. Only supported for Board objectType.'),
  includeItemUpdates: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When objectType is Board, also include updates on individual items. ' +
      'Defaults to false, returning only board discussion. ' +
      'Set to true to retrieve all updates on a board, including updates on individual items.',
    ),
};

function normalizeToISO8601DateTime(date: string, endOfDay = false): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return endOfDay ? `${date}T23:59:59Z` : `${date}T00:00:00Z`;
  }
  return date;
}

function truncateTextBody(textBody: string | null | undefined): {
  text_body: typeof textBody;
  text_body_truncated?: true;
} {
  if (!textBody || textBody.length <= MAX_TEXT_BODY_LENGTH) {
    return { text_body: textBody };
  }
  return { text_body: textBody.slice(0, MAX_TEXT_BODY_LENGTH), text_body_truncated: true };
}

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
      `To read several items, pass up to ${MAX_OBJECT_IDS} item IDs in objectIds in one call instead of calling once per item. ` +
      'For Board queries, you can filter by date range using fromDate and toDate (both required together, ISO8601 format). ' +
      'By default, Board queries return only board discussion. Set includeItemUpdates to true to also include updates on individual items, and add a date range to keep the response small. ' +
      `Returns update text (bodies over ${MAX_TEXT_BODY_LENGTH} characters are truncated and flagged with text_body_truncated), creator info, timestamps, and optionally replies and assets.`
    );
  }

  getInputSchema(): typeof getUpdatesToolSchema {
    return getUpdatesToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getUpdatesToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const hasFromDate = input.fromDate !== undefined;
      const hasToDate = input.toDate !== undefined;

      if (hasFromDate !== hasToDate) {
        throw new Error('Both fromDate and toDate must be provided together for date range filtering');
      }

      if ((hasFromDate || hasToDate) && input.objectType === UpdateObjectType.Item) {
        throw new Error('Date range filtering (fromDate/toDate) is only supported for Board objectType');
      }

      if (input.objectIds && input.objectType !== UpdateObjectType.Item) {
        throw new Error('objectIds is only supported for Item objectType');
      }

      const variables = {
        limit: input.limit ?? 25,
        page: input.page ?? 1,
        includeReplies: input.includeReplies ?? false,
        includeAssets: input.includeAssets ?? false,
      };

      if (input.objectIds) {
        const res = await this.mondayApi.request<GetItemsUpdatesQuery>(getItemsUpdates, {
          ...variables,
          itemIds: input.objectIds,
          itemsLimit: input.objectIds.length,
        });
        const items = (res.items ?? []).filter((item): item is NonNullable<typeof item> => !!item);
        return {
          content: {
            message: 'Updates retrieved',
            items: items.map((item) => ({
              item_id: item.id,
              url: item.url,
              updates: (item.updates ?? []).map((update) => formatUpdate(update, input)),
            })),
            pagination: { page: input.page ?? 1, limit: input.limit ?? 25 },
          },
        };
      }

      let res: GetItemUpdatesQuery | GetBoardUpdatesQuery;

      if (input.objectType === UpdateObjectType.Item) {
        res = await this.mondayApi.request<GetItemUpdatesQuery>(getItemUpdates, { ...variables, itemId: input.objectId });
      } else {
        res = await this.mondayApi.request<GetBoardUpdatesQuery>(getBoardUpdates, {
          ...variables,
          boardId: input.objectId,
          boardUpdatesOnly: !(input.includeItemUpdates ?? false),
          ...(input.fromDate && input.toDate ? { fromDate: normalizeToISO8601DateTime(input.fromDate), toDate: normalizeToISO8601DateTime(input.toDate, true) } : {}),
        });
      }

      const updates = input.objectType === UpdateObjectType.Item ? (res as GetItemUpdatesQuery).items?.[0]?.updates : (res as GetBoardUpdatesQuery).boards?.[0]?.updates;

      if (!updates || updates.length === 0) {
        return {
          content: `No updates found for ${input.objectType.toLowerCase()} with id ${input.objectId}`,
        };
      }

      const formattedUpdates = updates.map((update) => formatUpdate(update, input));

      const entityUrl = input.objectType === UpdateObjectType.Item
        ? (res as GetItemUpdatesQuery).items?.[0]?.url
        : (res as GetBoardUpdatesQuery).boards?.[0]?.url;

      const result = {
        message: "Updates retrieved",
        [`${input.objectType.toLowerCase()}_id`]: input.objectId,
        url: entityUrl,
        updates: formattedUpdates,
        pagination: {
          page: input.page ?? 1,
          limit: input.limit ?? 25,
          count: formattedUpdates.length,
        },
      };

      return {
        content: result
      };
    } catch (error) {
      rethrowWithContext(error, 'get updates');
    }
  }
}

type ItemOrBoardUpdate = NonNullable<NonNullable<NonNullable<GetItemUpdatesQuery['items']>[number]>['updates']>[number];

function formatUpdate(update: ItemOrBoardUpdate, input: ToolInputType<typeof getUpdatesToolSchema>) {
  const formattedUpdate: any = {
    id: update.id,
    ...truncateTextBody(update.text_body),
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
    formattedUpdate.replies = update.replies.map((reply) => ({
      id: reply.id,
      ...truncateTextBody(reply.text_body),
      created_at: reply.created_at,
      updated_at: reply.updated_at,
      creator: reply.creator
        ? {
            id: reply.creator.id,
            name: reply.creator.name,
          }
        : null,
    }));
  }

  if (input.includeAssets && update.assets) {
    formattedUpdate.assets = update.assets
      .filter((asset): asset is NonNullable<typeof asset> => !!asset)
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        url: asset.url,
        file_extension: asset.file_extension,
        file_size: asset.file_size,
        created_at: asset.created_at,
      }));
  }

  return formattedUpdate;
}
