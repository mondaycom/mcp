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

  const mockMeetingDetailResponse = {
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
            summary: 'Team discussed the new microservices architecture and migration plan.',
            topics: [
              {
                title: 'Migration Timeline',
                talking_points: [
                  { content: 'Phase 1 starts next sprint', timestamp: '00:05:30' },
                  { content: 'Phase 2 depends on API readiness', timestamp: '00:12:00' },
                ],
              },
              {
                title: 'Service Boundaries',
                talking_points: [{ content: 'Auth service will be extracted first', timestamp: '00:25:00' }],
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
              {
                id: 'ai_2',
                content: 'Set up monitoring dashboards',
                is_completed: true,
                owner: 'lead@example.com',
                due_date: null,
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
              {
                text: 'Sure, I have prepared some diagrams.',
                start_time: '00:00:11',
                end_time: '00:00:15',
                speaker: 'dev@example.com',
                language: 'en',
              },
            ],
          },
        ],
      },
    },
  };

  describe('List Mode (no id)', () => {
    it('should successfully return paginated notetaker meetings with default params', async () => {
      mocks.setResponse(mockMeetingsResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', {});

      expect(parsedResult.meetings).toHaveLength(2);
      expect(parsedResult.meetings[0].id).toBe('meeting_1');
      expect(parsedResult.meetings[0].title).toBe('Sprint Planning');
      expect(parsedResult.meetings[0].participants).toEqual([
        { email: 'alice@example.com' },
        { email: 'bob@example.com' },
      ]);
      expect(parsedResult.meetings[1].id).toBe('meeting_2');
      expect(parsedResult.pagination).toEqual({
        has_next_page: true,
        cursor: 'cursor_abc123',
        count: 2,
      });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetMeetings'),
        {
          limit: 25,
          cursor: undefined,
          filters: undefined,
        },
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support cursor pagination', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { cursor: 'prev_cursor_xyz' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetMeetings'),
        expect.objectContaining({
          cursor: 'prev_cursor_xyz',
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support search filter', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { search: 'sprint' });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetMeetings'),
        expect.objectContaining({
          filters: { search: 'sprint' },
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should support custom limit', async () => {
      mocks.setResponse(mockMeetingsResponse);

      await callToolByNameAsync('get_notetaker_meetings', { limit: 50 });

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetMeetings'),
        expect.objectContaining({
          limit: 50,
        }),
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should return "No notetaker meetings found" message when no meetings exist', async () => {
      mocks.setResponse(emptyMeetingsResponse);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toBe('No notetaker meetings found matching the specified criteria.');
    });

    it('should return "No notetaker meetings found" message when meetings field is null', async () => {
      mocks.setResponse({ notetaker: { meetings: { meetings: null } } });

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toBe('No notetaker meetings found matching the specified criteria.');
    });
  });

  describe('Detail Mode (with id)', () => {
    it('should successfully retrieve a single notetaker meeting with full details', async () => {
      mocks.setResponse(mockMeetingDetailResponse);

      const parsedResult = await callToolByNameAsync('get_notetaker_meetings', { id: 'meeting_42' });

      expect(parsedResult.id).toBe('meeting_42');
      expect(parsedResult.title).toBe('Architecture Review');
      expect(parsedResult.summary).toBe('Team discussed the new microservices architecture and migration plan.');

      expect(parsedResult.topics).toHaveLength(2);
      expect(parsedResult.topics[0].title).toBe('Migration Timeline');
      expect(parsedResult.topics[0].talking_points).toHaveLength(2);
      expect(parsedResult.topics[0].talking_points[0].content).toBe('Phase 1 starts next sprint');

      expect(parsedResult.action_items).toHaveLength(2);
      expect(parsedResult.action_items[0].content).toBe('Draft migration RFC');
      expect(parsedResult.action_items[0].is_completed).toBe(false);
      expect(parsedResult.action_items[1].is_completed).toBe(true);

      expect(parsedResult.transcript).toHaveLength(2);
      expect(parsedResult.transcript[0].speaker).toBe('lead@example.com');
      expect(parsedResult.transcript[1].text).toBe('Sure, I have prepared some diagrams.');

      expect(mocks.getMockRequest()).toHaveBeenCalledWith(
        expect.stringContaining('query GetMeeting'),
        { id: 'meeting_42' },
        expect.objectContaining({ versionOverride: '2026-04' }),
      );
    });

    it('should return error message when notetaker meeting is not found (empty meetings array)', async () => {
      mocks.setResponse({
        notetaker: {
          meetings: {
            meetings: [],
          },
        },
      });

      const result = await callToolByNameRawAsync('get_notetaker_meetings', { id: 'nonexistent_id' });

      expect(result.content[0].text).toBe(
        "No notetaker meeting found with id nonexistent_id, or you don't have permission to view it.",
      );
    });

    it('should return error message when meetings field is null', async () => {
      mocks.setResponse({
        notetaker: {
          meetings: {
            meetings: null,
          },
        },
      });

      const result = await callToolByNameRawAsync('get_notetaker_meetings', { id: 'null_id' });

      expect(result.content[0].text).toBe(
        "No notetaker meeting found with id null_id, or you don't have permission to view it.",
      );
    });
  });

  describe('Error Handling', () => {
    it('should pass errors to caller in list mode', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', {});

      expect(result.content[0].text).toContain(errorMessage);
    });

    it('should pass errors to caller in detail mode', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get_notetaker_meetings', { id: 'meeting_42' });

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

      expect(schema.id).toBeDefined();
      expect(schema.limit).toBeDefined();
      expect(schema.cursor).toBeDefined();
      expect(schema.search).toBeDefined();

      expect(() => schema.id.parse('meeting_42')).not.toThrow();
      expect(() => schema.limit.parse(25)).not.toThrow();
      expect(() => schema.limit.parse(1)).not.toThrow();
      expect(() => schema.limit.parse(100)).not.toThrow();
      expect(() => schema.cursor.parse('some_cursor')).not.toThrow();
      expect(() => schema.search.parse('sprint')).not.toThrow();
    });

    it('should have correct description covering both modes', () => {
      const tool = new GetNotetakerMeetingsTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('notetaker meetings');
      expect(description).toContain('summary');
      expect(description).toContain('transcript');
      expect(description).toContain('paginated');
    });
  });
});
