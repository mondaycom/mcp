import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { INVALID_TOOL_ARGS_CODE, rethrowWithContext, ToolValidationError } from '../../../../utils';
import { getItemsUpdates, getBoardUpdates } from './get-updates.graphql';
import { GetBoardUpdatesQuery, GetItemsUpdatesQuery } from 'src/monday-graphql/generated/graphql/graphql';

export enum UpdateObjectType {
  Item = 'Item',
  Board = 'Board',
}

export const MAX_OBJECT_IDS = 25;
export const MAX_TEXT_BODY_LENGTH = 2000;
export const DEFAULT_LIMIT = 25;
export const DEFAULT_LIMIT_PER_ITEM = 10;

export const getUpdatesToolSchema = {
  objectIds: z
    .array(z.string())
    .min(1)
    .max(MAX_OBJECT_IDS)
    .optional()
    .describe(
      `The IDs to get updates from. For Item, up to ${MAX_OBJECT_IDS} item IDs in one call, with limit and page applied to each item. For Board, exactly one board ID.`,
    ),
  objectId: z
    .string()
    .optional()
    .describe('A single item or board ID. Same as passing it alone in objectIds, which is preferred.'),
  objectType: z.enum([UpdateObjectType.Item, UpdateObjectType.Board]).describe('Type of object the IDs in objectIds belong to'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(
      `Number of updates per page (default: ${DEFAULT_LIMIT}, or ${DEFAULT_LIMIT_PER_ITEM} per item when reading several items, max: 100)`,
    ),
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
  includeFullText: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      `Leave this off by default. Set it only to re-read one item whose update came back with text_body_truncated and whose full body you need. It returns every update and reply body in full, which can make the response very large, so pass only that item's ID.`,
    ),
  fromDate: z
    .string()
    .optional()
    .describe('Start of date range filter (e.g. "2025-01-01" or "2025-01-01T00:00:00Z"). Must be used together with toDate. For Item queries it filters the updates in the fetched page by creation time, so raise limit to cover the range.'),
  toDate: z
    .string()
    .optional()
    .describe('End of date range filter (e.g. "2025-06-01" or "2025-06-01T23:59:59Z"). Must be used together with fromDate.'),
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

function truncateTextBody(
  textBody: string | null | undefined,
  fullText: boolean,
): {
  text_body: typeof textBody;
  text_body_truncated?: true;
} {
  if (fullText || !textBody || textBody.length <= MAX_TEXT_BODY_LENGTH) {
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
      'Get updates (comments/posts) from monday.com items or a board. ' +
      `Pass the IDs in objectIds and set objectType: up to ${MAX_OBJECT_IDS} item IDs for Item, in one call instead of calling once per item, or one board ID for Board. ` +
      'Filter by date range with fromDate and toDate (both required together, ISO8601 format). ' +
      'By default, Board queries return only board discussion. Set includeItemUpdates to true to also include updates on individual items, and add a date range to keep the response small. ' +
      `Returns update text (bodies over ${MAX_TEXT_BODY_LENGTH} characters are truncated and flagged with text_body_truncated. To read one in full, call again with only that item's ID and includeFullText), creator info, timestamps, and optionally replies and assets.`
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
        throw new ToolValidationError(
          'Both fromDate and toDate must be provided together for date range filtering',
          INVALID_TOOL_ARGS_CODE,
        );
      }

      const objectIds = [...new Set([...(input.objectIds ?? []), ...(input.objectId ? [input.objectId] : [])])];
      if (objectIds.length === 0) {
        throw new ToolValidationError('Provide the IDs to read in objectIds', INVALID_TOOL_ARGS_CODE);
      }

      if (objectIds.length > MAX_OBJECT_IDS) {
        throw new ToolValidationError(`objectIds takes up to ${MAX_OBJECT_IDS} IDs`, INVALID_TOOL_ARGS_CODE);
      }

      if (input.objectType === UpdateObjectType.Board && objectIds.length !== 1) {
        throw new ToolValidationError('Board queries take exactly one board ID in objectIds', INVALID_TOOL_ARGS_CODE);
      }

      const fromDate = input.fromDate ? normalizeToISO8601DateTime(input.fromDate) : undefined;
      const toDate = input.toDate ? normalizeToISO8601DateTime(input.toDate, true) : undefined;
      const variables = {
        page: input.page ?? 1,
        includeReplies: input.includeReplies ?? false,
        includeAssets: input.includeAssets ?? false,
      };

      if (input.objectType === UpdateObjectType.Item) {
        const limit = input.limit ?? (objectIds.length > 1 ? DEFAULT_LIMIT_PER_ITEM : DEFAULT_LIMIT);
        const res = await this.mondayApi.request<GetItemsUpdatesQuery>(getItemsUpdates, {
          ...variables,
          limit,
          itemIds: objectIds,
          itemsLimit: objectIds.length,
        });
        const items = (res.items ?? []).filter((item): item is NonNullable<typeof item> => !!item);
        const returnedIds = new Set(items.map((item) => item.id));
        const notFound = objectIds.filter((id) => !returnedIds.has(id));
        return {
          content: {
            message: 'Updates retrieved',
            items: items.map((item) => {
              const updates = (item.updates ?? [])
                .filter((update) => isWithinRange(update.created_at, fromDate, toDate))
                .map((update) => formatUpdate(update, input));
              return { item_id: item.id, url: item.url, updates, count: updates.length };
            }),
            ...(notFound.length > 0 && { not_found: notFound }),
            pagination: { page: input.page ?? 1, limit },
          },
        };
      }

      const [boardId] = objectIds;
      const limit = input.limit ?? DEFAULT_LIMIT;
      const res = await this.mondayApi.request<GetBoardUpdatesQuery>(getBoardUpdates, {
        ...variables,
        limit,
        boardId,
        boardUpdatesOnly: !(input.includeItemUpdates ?? false),
        ...(fromDate && toDate ? { fromDate, toDate } : {}),
      });

      const board = res.boards?.[0];
      const updates = board?.updates;

      if (!updates || updates.length === 0) {
        return {
          content: `No updates found for board with id ${boardId}`,
        };
      }

      const formattedUpdates = updates.map((update) => formatUpdate(update, input));

      return {
        content: {
          message: 'Updates retrieved',
          board_id: boardId,
          url: board?.url,
          updates: formattedUpdates,
          pagination: {
            page: input.page ?? 1,
            limit,
            count: formattedUpdates.length,
          },
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'get updates');
    }
  }
}

function isWithinRange(createdAt: string | null | undefined, fromDate?: string, toDate?: string): boolean {
  if (!fromDate || !toDate) {
    return true;
  }
  const created = createdAt ? Date.parse(createdAt) : NaN;
  return !Number.isNaN(created) && created >= Date.parse(fromDate) && created <= Date.parse(toDate);
}

type ItemOrBoardUpdate = NonNullable<NonNullable<NonNullable<GetItemsUpdatesQuery['items']>[number]>['updates']>[number];

function formatUpdate(update: ItemOrBoardUpdate, input: ToolInputType<typeof getUpdatesToolSchema>) {
  const formattedUpdate: any = {
    id: update.id,
    ...truncateTextBody(update.text_body, input.includeFullText ?? false),
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
      ...truncateTextBody(reply.text_body, input.includeFullText ?? false),
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
