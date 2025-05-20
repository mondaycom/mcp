import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { getNotifications, getUsersByName } from '../../monday-graphql/queries.graphql';
import { GetNotificationsQuery, GetNotificationsQueryVariables, Notification } from '../../monday-graphql/generated/graphql';

export const getNotificationsToolSchema = {
    cursor: z.string().optional().describe('The last notification id to get.'),
    limit: z.number().optional().describe(`Number of items to get, the default is 25.`),
    filter_read: z.boolean().optional().describe('Whether to get only unread notifications.'),
    since: z.string().optional().describe('Get notifications since this date.'),
};

export class GetNotificationsTool extends BaseMondayApiTool<typeof getNotificationsToolSchema> {
  name = 'get_notifications';
  type = ToolType.QUERY;

  getDescription(): string {
    return 'Get notifications, can be filtered by unread status, and since date';
  }

  getInputSchema(): typeof getNotificationsToolSchema {
    return getNotificationsToolSchema;
  }

  async execute(input: ToolInputType<typeof getNotificationsToolSchema>): Promise<ToolOutputType<never>> {
    const variables: GetNotificationsQueryVariables = {
      cursor: input.cursor,
      limit: input.limit,
      filter_read: input.filter_read,
      since: input.since,
    };

    const res = await this.mondayApi.request<GetNotificationsQuery>(getNotifications, variables);

    if (!res.notifications || res.notifications.length === 0) {
      return {
        content: 'No notifications were found.',
      }
    }

    const content = res.notifications.map((notification) => this.getContent(notification)).join('\n');

    return {
      content: `You've got the following notifications:\n ${content}`,
    }
  }

  private getContent(notification: Notification): string {
    const { creators, read, created_at, title, text, update, item, board } = notification;

    const formattedCreators = creators.length === 1
      ? creators[0].name
      : `${creators.slice(0, -1).map((creator) => creator.name).join(', ')} and ${creators[creators.length - 1].name}`;

    const lines = [];

    lines.push(
      read
        ? `You have a notification from ${formattedCreators}.`
        : `You have a new unread notification from ${formattedCreators}.`
    );

    if (created_at) {
      lines.push(`It was sent on ${new Date(created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}.`);
    }

    if (title) {
      lines.push(`Title: "${title}".`);
    }

    if (text) {
      lines.push(`Message: "${text}".`);
    }

    if (update && update.text_body) {
      lines.push(`This notification is related to the update: "${update.text_body}".`);
    }

    if (item) {
      lines.push(`It concerns the item "${item.name}" (ID: ${item.id}).`);
    }

    if (board) {
      let boardLine = `This is on the board "${board.name}" (ID: ${board.id})`;
      if (board.workspace) {
        boardLine += `, in the workspace "${board.workspace.name}" (ID: ${board.workspace.id})`;
      }
      boardLine += '.';
      lines.push(boardLine);
    }

    return lines.join('\n');
  }
}
