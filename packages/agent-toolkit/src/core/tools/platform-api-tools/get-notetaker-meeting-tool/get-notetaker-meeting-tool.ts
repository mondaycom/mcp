import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getNotetakerMeeting } from './get-notetaker-meeting-tool.graphql';

export const getNotetakerMeetingToolSchema = {
  id: z.string().describe('The unique identifier of the notetaker meeting to retrieve.'),
};

export class GetNotetakerMeetingTool extends BaseMondayApiTool<typeof getNotetakerMeetingToolSchema> {
  name = 'get_notetaker_meeting';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Notetaker Meeting',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Retrieve a single notetaker meeting by its ID with full details including AI-generated summary, ' +
      'discussion topics with talking points, action items, and the complete transcript.'
    );
  }

  getInputSchema(): typeof getNotetakerMeetingToolSchema {
    return getNotetakerMeetingToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getNotetakerMeetingToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = { id: input.id };

    const res = await this.mondayApi.request<any>(getNotetakerMeeting, variables, {
      versionOverride: '2026-04',
    });

    const meeting = res.notetaker?.meetings?.meetings?.[0];

    if (!meeting) {
      return {
        content: `No notetaker meeting found with id ${input.id}, or you don't have permission to view it.`,
      };
    }

    return {
      content: JSON.stringify(meeting, null, 2),
    };
  }
}
