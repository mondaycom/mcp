import { z } from 'zod';
import { NotificationTargetType } from '../../../../monday-graphql/generated/graphql/graphql';
import { createNotification } from './create-notification.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

export const createNotificationToolSchema = {
  user_id: z.string().describe('The user ID to send the notification to'),
  target_id: z.string().describe('The target ID (update/reply ID for Post type, item/board ID for Project type)'),
  text: z.string().describe('The notification text'),
  target_type: z.nativeEnum(NotificationTargetType).describe('The target type (Post for update/reply, Project for item/board)'),
};

export class CreateNotificationTool extends BaseMondayApiTool<typeof createNotificationToolSchema> {
  name = 'create_notification';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Notification',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Send a notification to a user via the bell icon and optionally by email. Use target_type "Post" for updates/replies or "Project" for items/boards.';
  }

  getInputSchema(): typeof createNotificationToolSchema {
    return createNotificationToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createNotificationToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      user_id: input.user_id,
      target_id: input.target_id,
      text: input.text,
      target_type: input.target_type as NotificationTargetType,
    };

    try {
      await this.mondayApi.request(createNotification, variables);

      return {
        content: `Notification successfully sent to user ${input.user_id}: "${input.text}"`,
      };
    } catch (error) {
      return {
        content: `Failed to send notification to user ${input.user_id}`,
      };
    }
  }
}
