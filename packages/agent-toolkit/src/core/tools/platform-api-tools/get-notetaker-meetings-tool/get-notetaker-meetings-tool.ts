import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getNotetakerMeetings, getNotetakerMeeting } from './get-notetaker-meetings-tool.graphql';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const getNotetakerMeetingsToolSchema = {
  id: z
    .string()
    .optional()
    .describe(
      'The unique identifier of a specific notetaker meeting to retrieve with full details (summary, topics, action items, transcript). ' +
        'When provided, limit/cursor/search are ignored.',
    ),
  limit: z
    .number()
    .min(MIN_LIMIT)
    .max(MAX_LIMIT)
    .optional()
    .default(DEFAULT_LIMIT)
    .describe('Maximum number of notetaker meetings to return per page (1-100). Used only when id is not provided.'),
  cursor: z
    .string()
    .optional()
    .describe(
      'Cursor for pagination. Use cursor from the previous page_info to fetch the next page. Used only when id is not provided.',
    ),
  search: z
    .string()
    .optional()
    .describe('Search notetaker meetings by title, participant name, or email. Used only when id is not provided.'),
};

export class GetNotetakerMeetingsTool extends BaseMondayApiTool<typeof getNotetakerMeetingsToolSchema> {
  name = 'get_notetaker_meetings';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Notetaker Meetings',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Retrieve notetaker meetings. ' +
      'When called with an id, returns a single meeting with full details including AI-generated summary, discussion topics, action items, and transcript. ' +
      'When called without an id, returns a paginated list of meetings with basic info. Supports filtering by search term and cursor-based pagination.'
    );
  }

  getInputSchema(): typeof getNotetakerMeetingsToolSchema {
    return getNotetakerMeetingsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getNotetakerMeetingsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.id) {
      return this.fetchMeetingById(input.id);
    }

    return this.fetchMeetingsList(input);
  }

  private async fetchMeetingById(id: string): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<any>(getNotetakerMeeting, { id }, { versionOverride: '2026-04' });

    const meeting = res.notetaker?.meetings?.meetings?.[0];

    if (!meeting) {
      return {
        content: `No notetaker meeting found with id ${id}, or you don't have permission to view it.`,
      };
    }

    return {
      content: JSON.stringify(meeting, null, 2),
    };
  }

  private async fetchMeetingsList(
    input: ToolInputType<typeof getNotetakerMeetingsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      limit: input.limit,
      cursor: input.cursor || undefined,
      filters: input.search ? { search: input.search } : undefined,
    };

    const res = await this.mondayApi.request<any>(getNotetakerMeetings, variables, {
      versionOverride: '2026-04',
    });

    const meetingsResponse = res.notetaker?.meetings;

    if (!meetingsResponse?.meetings || meetingsResponse.meetings.length === 0) {
      return {
        content: 'No notetaker meetings found matching the specified criteria.',
      };
    }

    const result = {
      meetings: meetingsResponse.meetings,
      pagination: {
        has_next_page: meetingsResponse.page_info?.has_next_page ?? false,
        cursor: meetingsResponse.page_info?.cursor ?? null,
        count: meetingsResponse.meetings.length,
      },
    };

    return {
      content: JSON.stringify(result, null, 2),
    };
  }
}
