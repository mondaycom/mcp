import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameAsync, callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { GetMeetingTool } from './get-meeting-tool';

describe('GetMeetingTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const mockMeetingResponse = {
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

  describe('Basic Functionality', () => {
    it('should successfully retrieve a single meeting with full details', async () => {
      mocks.setResponse(mockMeetingResponse);

      const parsedResult = await callToolByNameAsync('get_meeting', { id: 'meeting_42' });

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
  });

  describe('Meeting Not Found', () => {
    it('should return error message when meeting is not found (empty meetings array)', async () => {
      mocks.setResponse({
        notetaker: {
          meetings: {
            meetings: [],
          },
        },
      });

      const result = await callToolByNameRawAsync('get_meeting', { id: 'nonexistent_id' });

      expect(result.content[0].text).toBe(
        "No meeting found with id nonexistent_id, or you don't have permission to view it.",
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

      const result = await callToolByNameRawAsync('get_meeting', { id: 'null_id' });

      expect(result.content[0].text).toBe("No meeting found with id null_id, or you don't have permission to view it.");
    });
  });

  describe('Error Handling', () => {
    it('should pass errors to caller', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get_meeting', { id: 'meeting_42' });

      expect(result.content[0].text).toContain(errorMessage);
    });
  });

  describe('Schema Validation', () => {
    it('should have correct tool metadata', () => {
      const tool = new GetMeetingTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_meeting');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('Get Meeting');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });

    it('should have correct input schema', () => {
      const tool = new GetMeetingTool(mocks.mockApiClient, 'fake_token');
      const schema = tool.getInputSchema();

      expect(schema.id).toBeDefined();
      expect(() => schema.id.parse('meeting_42')).not.toThrow();
    });

    it('should have correct description', () => {
      const tool = new GetMeetingTool(mocks.mockApiClient, 'fake_token');
      const description = tool.getDescription();

      expect(description).toContain('meeting');
      expect(description).toContain('summary');
      expect(description).toContain('transcript');
    });
  });
});
