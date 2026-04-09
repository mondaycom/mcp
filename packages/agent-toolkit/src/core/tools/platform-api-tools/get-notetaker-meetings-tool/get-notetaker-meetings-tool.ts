import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getNotetakerMeetings } from './get-notetaker-meetings-tool.graphql';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const MEETING_ACCESS_VALUES = ['OWN', 'SHARED_WITH_ME', 'SHARED_WITH_ACCOUNT', 'ALL'] as const;

export const getNotetakerMeetingsToolSchema = {
  ids: z
    .array(z.string())
    .optional()
    .describe('Filter by specific meeting IDs. Use this to fetch one or more specific meetings in a single call.'),
  access: z
    .enum(MEETING_ACCESS_VALUES)
    .optional()
    .default('OWN')
    .describe(
      'Filter meetings by access level. OWN: meetings the user participated in or invited the bot to. SHARED_WITH_ME: meetings shared with the user or their team. SHARED_WITH_ACCOUNT: meetings shared with the entire account. ALL: all meetings the user has access to.',
    ),
  limit: z
    .number()
    .min(MIN_LIMIT)
    .max(MAX_LIMIT)
    .optional()
    .default(DEFAULT_LIMIT)
    .describe('Maximum number of notetaker meetings to return per page (1-100).'),
  cursor: z
    .string()
    .optional()
    .describe('Cursor for pagination. Use cursor from the previous page_info to fetch the next page.'),
  search: z.string().optional().describe('Search notetaker meetings by title, participant name, or email.'),
  include_summary: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include the AI-generated summary for each meeting.'),
  include_topics: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include discussion topics and talking points for each meeting.'),
  include_action_items: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include action items for each meeting.'),
  include_transcript: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include the full transcript for each meeting. Transcripts can be very large.'),
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
      'Retrieve notetaker meetings with optional detailed fields. ' +
      'Use include_summary, include_topics, include_action_items, and include_transcript flags to control which details are returned. ' +
      'Use access to filter by meeting access level (OWN, SHARED_WITH_ME, SHARED_WITH_ACCOUNT, ALL). Defaults to OWN. ' +
      'Supports filtering by ids, search term, and cursor-based pagination.'
    );
  }

  getInputSchema(): typeof getNotetakerMeetingsToolSchema {
    return getNotetakerMeetingsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getNotetakerMeetingsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const filters: Record<string, unknown> = {
      access: input.access,
    };
    if (input.ids && input.ids.length > 0) {
      filters.ids = input.ids;
    }
    if (input.search) {
      filters.search = input.search;
    }

    const variables = {
      limit: input.limit,
      cursor: input.cursor || undefined,
      filters,
      includeSummary: input.include_summary,
      includeTopics: input.include_topics,
      includeActionItems: input.include_action_items,
      includeTranscript: input.include_transcript,
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
      content: { message: 'Meetings retrieved', data: result },
    };
  }
}
