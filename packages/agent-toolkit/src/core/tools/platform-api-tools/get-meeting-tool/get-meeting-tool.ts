import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getMeeting } from './get-meeting-tool.graphql';

export const getMeetingToolSchema = {
  id: z.string().describe('The unique identifier of the meeting to retrieve.'),
};

export class GetMeetingTool extends BaseMondayApiTool<typeof getMeetingToolSchema> {
  name = 'get_meeting';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Meeting',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Retrieve a single meeting by its ID with full details including AI-generated summary, ' +
      'discussion topics with talking points, action items, and the complete transcript.'
    );
  }

  getInputSchema(): typeof getMeetingToolSchema {
    return getMeetingToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getMeetingToolSchema>): Promise<ToolOutputType<never>> {
    const variables = { id: input.id };

    const res = await this.mondayApi.request<any>(getMeeting, variables, {
      versionOverride: '2026-04',
    });

    const meeting = res.notetaker?.meetings?.meetings?.[0];

    if (!meeting) {
      return {
        content: `No meeting found with id ${input.id}, or you don't have permission to view it.`,
      };
    }

    return {
      content: JSON.stringify(meeting, null, 2),
    };
  }
}
