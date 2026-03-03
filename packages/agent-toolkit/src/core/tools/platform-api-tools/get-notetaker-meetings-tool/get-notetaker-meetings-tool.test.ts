import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { GetNotetakerMeetingsTool } from './get-notetaker-meetings-tool';

describe('GetNotetakerMeetingsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockMeetingsResponse = {
    notetaker: {
      meetings: {
        meetings: [
          {
            id: 'meeting_1',
            title: 'Sprint Planning',
            start_time: '2025-01-15T10:00:00Z',
            end_time: '2025-01-15T11:00:00Z',
            recording_duration: 3600,
            access_type: 'public',
            meeting_link: 'https://zoom.us/j/123456',
            participants: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
          },
          {
            id: 'meeting_2',
            title: 'Retrospective',
            start_time: '2025-01-16T14:00:00Z',
            end_time: '2025-01-16T15:00:00Z',
            recording_duration: 3600,
            access_type: 'private',
            meeting_link: 'https://zoom.us/j/789012',
            participants: [{ email: 'charlie@example.com' }],
          },
        ],
        page_info: {
          has_next_page: true,
          cursor: 'cursor_abc123',
        },
      },
    },
  };

  const mockMeetingsWithDetailsResponse = {
    notetaker: {
      meetings: {
        meetings: [
          {
            id: 'meeting_1',
            title: 'Sprint Planning',
            start_time: '2025-01-15T10:00:00Z',
            end_time: '2025-01-15T11:00:00Z',
            recording_duration: 3600,
            access_type: 'public',
            meeting_link: 'https://zoom.us/j/123456',
            participants: [{ email: 'alice@example.com' }],
            action_items: [
              { id: 'ai_1', content: 'Fix bug', is_completed: false, owner: 'alice@example.com', due_date: null },
            ],
          },
          {
            id: 'meeting_2',
            title: 'Retrospective',
            start_time: '2025-01-16T14:00:00Z',
            end_time: '2025-01-16T15:00:00Z',
            recording_duration: 3600,
            access_type: 'private',
            meeting_link: 'https://zoom.us/j/789012',
            participants: [{ email: 'charlie@example.com' }],
            action_items: [
              { id: 'ai_2', content: 'Write docs', is_completed: true, owner: 'charlie@example.com', due_date: null },
            ],
          },
        ],
        page_info: {
          has_next_page: false,
          cursor: null,
        },
      },
    },
  };

  const emptyMeetingsResponse = {
    notetaker: {
      meetings: {
        meetings: [],
        page_info: {
          has_next_page: false,
          cursor: null,
        },
      },
    },
  };

  const mockDetailResponse = {
    notetaker: {
      meetings: {
        meetings: [
          {
            id: 'meeting_42',
            title: 'Architecture Review',
            start_time: '2025-02-10T09:00:00Z',
            end_time: '2025-02-10T10:30:00Z',
            recording_duration: 5400,
            access_type: 'public',
            meeting_link: 'https://zoom.us/j/555555',
            participants: [{ email: 'dev@example.com' }, { email: 'lead@example.com' }],
            summary: 'Team discussed the new microservices architecture.',
            topics: [
              {
                title: 'Migration Timeline',
                talking_points: [{ content: 'Phase 1 starts next sprint', timestamp: '00:05:30' }],
              },
            ],
            action_items: [
              {
                id: 'ai_1',
                content: 'Draft migration RFC',
                is_completed: false,
                owner: 'dev@example.com',
                due_date: '2025-02-17',
              },
            ],
            transcript: [
              {
                text: 'Let us start with the architecture overview.',
                start_time: '00:00:05',
                end_time: '00:00:10',
                speaker: 'lead@example.com',
                language: 'en',
              },
            ],
          },
        ],
        page_info: {
          has_next_page: false,
          cursor: null,
        },
      },
    },
  };

  describe('Listing meetings', () => {
    it('should return paginated meetings with default params', async () => {
      mocks.setResponse(mockMeetingsResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', {});

      expect(parsedResult.meetings).toHaveLength(2);
      expect(parsedResult.meetings[0].id).toBe('meeting_1');
      expect(parsedResult.pagination).toEqual({
        has_next_page: true,
        cursor: 'cursor_abc123',
        count: 2,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({
          limit: 25,
          cursor: undefined,
          filters: undefined,
          includeSummary: false,
          includeTopics: false,
          includeActionItems: false,
          includeTranscript: false,
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support cursor pagination', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { cursor: 'prev_cursor_xyz' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({ cursor: 'prev_cursor_xyz' }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support search filter', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { search: 'sprint' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({ filters: { search: 'sprint' } }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support custom limit', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { limit: 50 });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({ limit: 50 }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should return "No notetaker meetings found" for empty results', async () => {
      mocks.setResponse(emptyMeetingsResponse);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toBe('No notetaker meetings found matching the specified criteria.');
    });

    it('should return "No notetaker meetings found" when meetings field is null', async () => {
      mocks.setResponse({ notetaker: { meetings: { meetings: null } } });

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toBe('No notetaker meetings found matching the specified criteria.');
    });
  });

  describe('Include flags', () => {
    it('should fetch action items with listing when include_action_items is true', async () => {
      mocks.setResponse(mockMeetingsWithDetailsResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', {
        limit: 2,
        include_action_items: true,
      });

      expect(parsedResult.meetings).toHaveLength(2);
      expect(parsedResult.meetings[0].action_items[0].content).toBe('Fix bug');
      expect(parsedResult.meetings[1].action_items[0].content).toBe('Write docs');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({
          limit: 2,
          includeActionItems: true,
          includeSummary: false,
          includeTopics: false,
          includeTranscript: false,
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should pass all include flags to GraphQL', async () => {
      mocks.setResponse(mockDetailResponse);

      await callToolByNameAsync('get_notetaker_meetings', {
        ids: ['meeting_42'],
        include_summary: true,
        include_topics: true,
        include_action_items: true,
        include_transcript: true,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({
          filters: { ids: ['meeting_42'] },
          includeSummary: true,
          includeTopics: true,
          includeActionItems: true,
          includeTranscript: true,
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should default all include flags to false', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', {});

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({
          includeSummary: false,
          includeTopics: false,
          includeActionItems: false,
          includeTranscript: false,
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });
  });

  describe('Filtering by ids', () => {
    it('should filter by a single id', async () => {
      mocks.setResponse(mockDetailResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', {
        ids: ['meeting_42'],
        include_summary: true,
      });

      expect(parsedResult.meetings).toHaveLength(1);
      expect(parsedResult.meetings[0].id).toBe('meeting_42');
      expect(parsedResult.meetings[0].summary).toBe('Team discussed the new microservices architecture.');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({ filters: { ids: ['meeting_42'] } }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should filter by multiple ids', async () => {
      const multiResponse = {
        notetaker: {
          meetings: {
            meetings: [
              { ...mockDetailResponse.notetaker.meetings.meetings[0] },
              { ...mockDetailResponse.notetaker.meetings.meetings[0], id: 'meeting_43', title: 'Sprint Retro' },
            ],
            page_info: { has_next_page: false, cursor: null },
          },
        },
      };
      mocks.setResponse(multiResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', {
        ids: ['meeting_42', 'meeting_43'],
      });

      expect(parsedResult.meetings).toHaveLength(2);
      expect(parsedResult.meetings[0].id).toBe('meeting_42');
      expect(parsedResult.meetings[1].id).toBe('meeting_43');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetNotetakerMeetings'),
        expect.objectContaining({ filters: { ids: ['meeting_42', 'meeting_43'] } }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should return error message when no meetings found for provided ids', async () => {
      mocks.setResponse(emptyMeetingsResponse);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', { ids: ['nonexistent_id'] });

      expect(result.content[0].text).toBe('No notetaker meetings found matching the specified criteria.');
    });
  });

  describe('Error Handling', () => {
    it('should pass errors to caller', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toContain(errorMessage);
    });
  });

  describe('Schema Validation', () => {
    it('should have correct tool metadata', () => {
      const tool = new GetNotetakerMeetingsTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_notetaker_meetings');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Get Notetaker Meetings');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct input schema', () => {
      const tool = new GetNotetakerMeetingsTool(mocks.mockApiClient, 'fake_token');
      const schema = tool.getInputSchema();

      expect(schema.ids).toBeDefined();
      expect(schema.limit).toBeDefined();
      expect(schema.cursor).toBeDefined();
      expect(schema.search).toBeDefined();
      expect(schema.include_summary).toBeDefined();
      expect(schema.include_topics).toBeDefined();
      expect(schema.include_action_items).toBeDefined();
      expect(schema.include_transcript).toBeDefined();
    });

    it('should have correct description', () => {
      const tool = new GetNotetakerMeetingsTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('notetaker meetings');
      expect(description).toContain('include_summary');
      expect(description).toContain('pagination');
    });
  });
});
