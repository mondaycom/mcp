import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getMeetings } from './get-meetings-tool.graphql';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const getMeetingsToolSchema = {
  limit: z
    .number()
    .min(MIN_LIMIT)
    .max(MAX_LIMIT)
    .optional()
    .default(DEFAULT_LIMIT)
    .describe('Maximum number of meetings to return per page (1-100).'),
  cursor: z
    .string()
    .optional()
    .describe('Cursor for pagination. Use cursor from the previous page_info to fetch the next page.'),
  filters: z
    .object({
      search: z.string().optional().describe('Search meetings by title, participant name, or email.'),
    })
    .optional()
    .describe('Filters to apply to the meetings list.'),
};

export class GetMeetingsTool extends BaseMondayApiTool<typeof getMeetingsToolSchema> {
  name = 'get_meetings';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Meetings',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Retrieve a paginated list of meetings with completed recordings that the current user has view permissions for. ' +
      'Supports filtering by search term. ' +
      'Use the cursor from page_info to paginate through results.'
    );
  }

  getInputSchema(): typeof getMeetingsToolSchema {
    return getMeetingsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getMeetingsToolSchema>): Promise<ToolOutputType<never>> {
    const variables = {
      limit: input.limit,
      cursor: input.cursor || undefined,
      filters: input.filters || undefined,
    };

    const res = await this.mondayApi.request<any>(getMeetings, variables, {
      versionOverride: '2026-04',
    });

    const meetingsResponse = res.notetaker?.meetings;

    if (!meetingsResponse?.meetings || meetingsResponse.meetings.length === 0) {
      return {
        content: 'No meetings found matching the specified criteria.',
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
