import { FetchCustomActivityQuery } from '../../../monday-graphql/generated/graphql';
import { fetchCustomActivity } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const fetchCustomActivityToolSchema = {};

export class FetchCustomActivityTool extends BaseMondayApiTool<typeof fetchCustomActivityToolSchema> {
  name = 'fetch_custom_activity';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Fetch Custom Activities',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get custom activities from the E&A app';
  }

  getInputSchema(): typeof fetchCustomActivityToolSchema {
    return fetchCustomActivityToolSchema;
  }

  async execute(input: ToolInputType<typeof fetchCustomActivityToolSchema>): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<FetchCustomActivityQuery>(fetchCustomActivity);

    if (!res.custom_activity || res.custom_activity.length === 0) {
      return {
        content: 'No custom activities found',
      };
    }

    const activities = res.custom_activity.map((activity) => {
      return {
        id: activity.id,
        name: activity.name,
        color: activity.color,
        icon_id: activity.icon_id,
        type: activity.type,
      };
    });

    return {
      content: `Found ${activities.length} custom activities: ${JSON.stringify(activities, null, 2)}`,
    };
  }
}
