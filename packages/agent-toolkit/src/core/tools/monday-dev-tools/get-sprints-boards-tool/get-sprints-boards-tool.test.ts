import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../platform-api-tools/test-utils/mock-api-client';
import { GetSprintsBoardsTool } from './get-sprints-boards-tool';
import {
  VALID_BOARD_PAIR_RESPONSE,
  MULTIPLE_BOARD_PAIRS_RESPONSE,
  SPRINTS_BOARD_ONLY_RESPONSE,
  TASKS_BOARD_ONLY_RESPONSE,
  ALTERNATIVE_SETTINGS_FORMAT_RESPONSE,
  BOARDS_WITHOUT_WORKSPACE_RESPONSE,
  INVALID_BOARDS_RESPONSE,
  NO_BOARDS_RESPONSE,
  REGULAR_BOARDS_RESPONSE,
  EXPECTED_SINGLE_PAIR_OUTPUT,
  EXPECTED_MULTIPLE_PAIRS_OUTPUT,
  EXPECTED_SPRINTS_BOARD_ONLY_OUTPUT,
  EXPECTED_TASKS_BOARD_ONLY_OUTPUT,
  EXPECTED_NO_BOARDS_ERROR,
  EXPECTED_NO_VALID_PAIRS_MESSAGE,
  EXPECTED_BOARDS_WITHOUT_WORKSPACE_OUTPUT,
  EXPECTED_GRAPHQL_ERROR,
} from './get-sprints-boards-tool-test-data';

describe('GetSprintsBoardsTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  describe('Basic Functionality', () => {
    it('should successfully find a single board pair', async () => {
      mocks.setResponse(VALID_BOARD_PAIR_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_SINGLE_PAIR_OUTPUT);

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('query GetRecentBoards');
      expect(calls[0][1]).toEqual({ limit: 100 });
    });

    it('should successfully find multiple board pairs', async () => {
      mocks.setResponse(MULTIPLE_BOARD_PAIRS_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_MULTIPLE_PAIRS_OUTPUT);
    });

    it('should have correct tool metadata', () => {
      const tool = new GetSprintsBoardsTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get-monday-dev-sprints-boards');
      expect(tool.type).toBe('read');
      expect(tool.annotations.title).toBe('monday-dev: Get Sprints Boards');
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    });
  });

  describe('Board Pair Discovery', () => {
    it('should find pair when only sprints board is in recent list', async () => {
      mocks.setResponse(SPRINTS_BOARD_ONLY_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_SPRINTS_BOARD_ONLY_OUTPUT);
    });

    it('should find pair when only tasks board is in recent list', async () => {
      mocks.setResponse(TASKS_BOARD_ONLY_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_TASKS_BOARD_ONLY_OUTPUT);
    });

    it('should handle alternative settings format (boardId instead of boardIds)', async () => {
      mocks.setResponse(ALTERNATIVE_SETTINGS_FORMAT_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      // Uses boardId instead of boardIds, but produces same output format
      expect(content).toBe(EXPECTED_SINGLE_PAIR_OUTPUT);
    });

    it('should handle boards without workspace information', async () => {
      mocks.setResponse(BOARDS_WITHOUT_WORKSPACE_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_BOARDS_WITHOUT_WORKSPACE_OUTPUT);
    });
  });

  describe('Empty and No Matches Cases', () => {
    it('should return error when no boards found', async () => {
      mocks.setResponse(NO_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_NO_BOARDS_ERROR);
    });

    it('should return helpful message when boards found but no valid pairs', async () => {
      mocks.setResponse(REGULAR_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_NO_VALID_PAIRS_MESSAGE);
    });

    it('should handle boards with missing required columns', async () => {
      mocks.setResponse(INVALID_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      // Boards don't have all required columns, so no pairs should be found
      expect(content).toContain('No Monday-Dev Sprints Board Pairs Found');
      expect(content).toContain('**Boards Checked:** 2');
    });

  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors gracefully', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get-monday-dev-sprints-boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_GRAPHQL_ERROR);
    });
  });

});

