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

  describe('Basic Functionality', () => {
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

      await callToolByNameAsync('get_notetaker_meetings', { filters: { search: 'sprint' } });

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
  });

  describe('Empty Results', () => {
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

      expect(schema.limit).toBeDefined();
      expect(schema.cursor).toBeDefined();
      expect(schema.filters).toBeDefined();

      expect(() => schema.limit.parse(25)).not.toThrow();
      expect(() => schema.limit.parse(1)).not.toThrow();
      expect(() => schema.limit.parse(100)).not.toThrow();
      expect(() => schema.cursor.parse('some_cursor')).not.toThrow();
    });

    it('should have correct description', () => {
      const tool = new GetNotetakerMeetingsTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('notetaker meetings');
      expect(description).toContain('paginated');
    });
  });
});
