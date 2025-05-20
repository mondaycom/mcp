import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';
import { getNotifications, getUsersByName } from '../../monday-graphql/queries.graphql';
import { GetNotificationsQuery, GetNotificationsQueryVariables, Notification } from '../../monday-graphql/generated/graphql';

export const getNotificationsToolSchema = {
    cursor: z.string().optional().describe('The last notification id to get.'),
    limit: z.number().optional().describe(`Number of items to get, the default is 25.`),
    read: z.boolean().optional().describe('Whether to get read notifications.'),
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
    // TODO: replace any with GetNotificationsQueryVariables
    const variables: GetNotificationsQueryVariables = {
      cursor: input.cursor,
      limit: input.limit,
      read: input.read,
      since: input.since,
    };

    // TODO: replace any with GetNotificationsQuery
    const res = await this.mondayApi.request<GetNotificationsQuery>(getNotifications, variables);

    if (!res.notifications || res.notifications.length === 0) {
      return {
        content: 'No notifications found.',
      }
    }

    const content = res.notifications.map((notification) => this.getContent(notification)).join('\n');

    return {
      content: `You've got the following notifications:\n ${content}`,
    }
  }

  private getContent(notification: Notification): string {
    const { creators, read, created_at, title, text, update, item, board } = notification;

    const formattedCreators = creators.length === 1 ? creators[0].name : `${creators.slice(0, -1).map((creator) => creator.name).join(', ')} and ${creators[creators.length - 1].name}`;

    let content = `A ${read ? '' : 'unread'} notification from ${formattedCreators} sent on ${created_at} titled ${title} with content ${text}.`

    if (update) {
      content = `${content} originated in the following update: ${update.text_body}.`
    }

    if (item) {
      content = `${content} in item ${item.name} (Item ID: ${item.id}`
    }

    if (board) {
      content = `${content} in the board ${board.name} (Board ID: ${board.id})`;

      if (board.workspace) {
        content = `${content} in the workspace ${board.workspace.name} (Workspace ID: ${board.workspace.id}).`
      }
    }


    return content;
  }
}
