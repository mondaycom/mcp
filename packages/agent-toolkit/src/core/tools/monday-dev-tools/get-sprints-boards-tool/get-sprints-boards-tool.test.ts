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
  EXPECTED_NO_BOARDS_ERROR,
  EXPECTED_GRAPHQL_ERROR,
  TECHNICAL_REFERENCE,
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

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('Found 1 matched pair(s)');
      expect(parsed.pairs).toHaveLength(1);
      expect(parsed.pairs[0].sprints_board.id).toBe('1001');
      expect(parsed.pairs[0].sprints_board.name).toBe('Sprints Board');
      expect(parsed.pairs[0].sprints_board.workspace_id).toBe('ws_1');
      expect(parsed.pairs[0].sprints_board.workspace_name).toBe('Development Team');
      expect(parsed.pairs[0].tasks_board.id).toBe('2001');
      expect(parsed.pairs[0].tasks_board.name).toBe('Tasks Board');
      expect(parsed.pairs[0].tasks_board.workspace_id).toBe('ws_1');
      expect(parsed.pairs[0].tasks_board.workspace_name).toBe('Development Team');
      expect(parsed.technical_reference).toBe(TECHNICAL_REFERENCE);
      expect(parsed.warning).toBeUndefined();

      const calls = mocks.getMockRequest().mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('query GetRecentBoards');
      expect(calls[0][1]).toEqual({ limit: 100 });
    });

    it('should successfully find multiple board pairs', async () => {
      mocks.setResponse(MULTIPLE_BOARD_PAIRS_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('Found 2 matched pair(s)');
      expect(parsed.pairs).toHaveLength(2);
      expect(parsed.warning).toBe('Multiple board pairs detected. Confirm with user which pair and workspace to use before any operation.');
      expect(parsed.pairs[0].sprints_board.id).toBe('1001');
      expect(parsed.pairs[0].sprints_board.name).toBe('Frontend Sprints');
      expect(parsed.pairs[1].sprints_board.id).toBe('1002');
      expect(parsed.pairs[1].sprints_board.name).toBe('Backend Sprints');
    });

    it('should have correct tool metadata', () => {
      const tool = new GetSprintsBoardsTool(mocks.mockApiClient, 'fake_token');

      expect(tool.name).toBe('get_monday_dev_sprints_boards');
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

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('Found 1 matched pair(s)');
      expect(parsed.pairs).toHaveLength(1);
      expect(parsed.pairs[0].sprints_board.id).toBe('1001');
      expect(parsed.pairs[0].sprints_board.name).toBe('Sprints Board');
      expect(parsed.pairs[0].sprints_board.workspace_id).toBe('ws_1');
      // tasks board not in recent list - uses fallback name and unknown workspace
      expect(parsed.pairs[0].tasks_board.id).toBe('2001');
      expect(parsed.pairs[0].tasks_board.name).toBe('Tasks Board 2001');
      expect(parsed.pairs[0].tasks_board.workspace_id).toBe('unknown');
      expect(parsed.pairs[0].tasks_board.workspace_name).toBe('Unknown');
    });

    it('should find pair when only tasks board is in recent list', async () => {
      mocks.setResponse(TASKS_BOARD_ONLY_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('Found 1 matched pair(s)');
      expect(parsed.pairs).toHaveLength(1);
      // sprints board not in recent list - uses fallback name and unknown workspace
      expect(parsed.pairs[0].sprints_board.id).toBe('1001');
      expect(parsed.pairs[0].sprints_board.name).toBe('Sprints Board 1001');
      expect(parsed.pairs[0].sprints_board.workspace_id).toBe('unknown');
      expect(parsed.pairs[0].tasks_board.id).toBe('2001');
      expect(parsed.pairs[0].tasks_board.name).toBe('Tasks Board');
      expect(parsed.pairs[0].tasks_board.workspace_id).toBe('ws_1');
    });

    it('should handle alternative settings format (boardId instead of boardIds)', async () => {
      mocks.setResponse(ALTERNATIVE_SETTINGS_FORMAT_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      // Uses boardId instead of boardIds, but produces same output structure
      expect(parsed.message).toBe('Found 1 matched pair(s)');
      expect(parsed.pairs).toHaveLength(1);
      expect(parsed.pairs[0].sprints_board.id).toBe('1001');
      expect(parsed.pairs[0].tasks_board.id).toBe('2001');
    });

    it('should handle boards without workspace information', async () => {
      mocks.setResponse(BOARDS_WITHOUT_WORKSPACE_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('Found 1 matched pair(s)');
      expect(parsed.pairs).toHaveLength(1);
      expect(parsed.pairs[0].sprints_board.workspace_id).toBe('unknown');
      expect(parsed.pairs[0].sprints_board.workspace_name).toBe('Unknown');
      expect(parsed.pairs[0].tasks_board.workspace_id).toBe('unknown');
      expect(parsed.pairs[0].tasks_board.workspace_name).toBe('Unknown');
    });
  });

  describe('Empty and No Matches Cases', () => {
    it('should return error when no boards found', async () => {
      mocks.setResponse(NO_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_NO_BOARDS_ERROR);
    });

    it('should return helpful message when boards found but no valid pairs', async () => {
      mocks.setResponse(REGULAR_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.message).toBe('No monday-dev sprints board pairs found');
      expect(parsed.pairs).toEqual([]);
      expect(parsed.boards_checked).toBe(2);
    });

    it('should handle boards with missing required columns', async () => {
      mocks.setResponse(INVALID_BOARDS_RESPONSE);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const parsed = JSON.parse(result.content[0].text);

      // Boards don't have all required columns, so no pairs should be found
      expect(parsed.message).toBe('No monday-dev sprints board pairs found');
      expect(parsed.pairs).toEqual([]);
      expect(parsed.boards_checked).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors gracefully', async () => {
      const errorMessage = 'GraphQL error occurred';
      mocks.setError(errorMessage);

      const result = await callToolByNameRawAsync('get_monday_dev_sprints_boards', {});
      const content = result.content[0].text;

      expect(content).toBe(EXPECTED_GRAPHQL_ERROR);
    });
  });
});
