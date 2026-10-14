import { NonDeprecatedColumnType } from 'src/utils/types';
import { GetRecentBoardsQuery } from '../../../../monday-graphql/generated/graphql/graphql';

/**
 * Valid sprints and tasks boards with proper relationships
 */
export const VALID_BOARD_PAIR_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '1001',
      name: 'Sprints Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2001',
      name: 'Tasks Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
  ],
};

/**
 * Multiple board pairs in different workspaces
 */
export const MULTIPLE_BOARD_PAIRS_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    // First pair
    {
      id: '1001',
      name: 'Frontend Sprints',
      workspace: {
        id: 'ws_frontend',
        name: 'Frontend Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2001',
      name: 'Frontend Tasks',
      workspace: {
        id: 'ws_frontend',
        name: 'Frontend Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
    // Second pair
    {
      id: '1002',
      name: 'Backend Sprints',
      workspace: {
        id: 'ws_backend',
        name: 'Backend Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2002'] },
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2002',
      name: 'Backend Tasks',
      workspace: {
        id: 'ws_backend',
        name: 'Backend Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1002'] },
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
  ],
};

/**
 * Sprints board found but tasks board not in recent list
 */
export const SPRINTS_BOARD_ONLY_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '1001',
      name: 'Sprints Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2001'] }, // References board not in the list
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
  ],
};

/**
 * Tasks board found but sprints board not in recent list
 */
export const TASKS_BOARD_ONLY_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '2001',
      name: 'Tasks Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1001'] }, // References board not in the list
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
  ],
};

/**
 * Board with alternative settings format (boardId instead of boardIds)
 */
export const ALTERNATIVE_SETTINGS_FORMAT_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '1001',
      name: 'Sprints Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardId: '2001' }, // Using boardId instead of boardIds
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2001',
      name: 'Tasks Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardId: '1001' },
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
  ],
};

/**
 * Boards with missing workspace information
 */
export const BOARDS_WITHOUT_WORKSPACE_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '1001',
      name: 'Sprints Board',
      workspace: null,
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: NonDeprecatedColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: NonDeprecatedColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: NonDeprecatedColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: NonDeprecatedColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2001',
      name: 'Tasks Board',
      workspace: null,
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'task_epic', type: NonDeprecatedColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: NonDeprecatedColumnType.Numbers, settings: {} },
      ],
    },
  ],
};

/**
 * Boards with missing required columns
 */
export const INVALID_BOARDS_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '1001',
      name: 'Incomplete Sprints Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'sprint_tasks',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: NonDeprecatedColumnType.Timeline, settings: {} },
        // Missing other required columns
      ],
    },
    {
      id: '2001',
      name: 'Incomplete Tasks Board',
      workspace: {
        id: 'ws_1',
        name: 'Development Team',
      },
      columns: [
        {
          id: 'task_sprint',
          type: NonDeprecatedColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        // Missing task_epic and task_estimation
      ],
    },
  ],
};

/**
 * Empty boards list
 */
export const NO_BOARDS_RESPONSE: GetRecentBoardsQuery = {
  boards: [],
};

/**
 * Regular boards (not monday-dev boards)
 */
export const REGULAR_BOARDS_RESPONSE: GetRecentBoardsQuery = {
  boards: [
    {
      id: '5001',
      name: 'Project Management Board',
      workspace: {
        id: 'ws_1',
        name: 'General Workspace',
      },
      columns: [
        { id: 'status', type: NonDeprecatedColumnType.Status, settings: {} },
        { id: 'owner', type: NonDeprecatedColumnType.People, settings: {} },
        { id: 'date', type: NonDeprecatedColumnType.Date, settings: {} },
      ],
    },
    {
      id: '5002',
      name: 'CRM Board',
      workspace: {
        id: 'ws_2',
        name: 'Sales Workspace',
      },
      columns: [
        { id: 'client_name', type: NonDeprecatedColumnType.Text, settings: {} },
        { id: 'deal_value', type: NonDeprecatedColumnType.Numbers, settings: {} },
        { id: 'stage', type: NonDeprecatedColumnType.Status, settings: {} },
      ],
    },
  ],
};

/**
 * Expected output content for various scenarios
 * These are helpers for asserting on parsed JSON output from the tool.
 */

export const EXPECTED_NO_BOARDS_ERROR = `BOARD_NOT_FOUND: No boards found in your account. Please verify you have access to monday.com boards.`;

export const EXPECTED_GRAPHQL_ERROR = `INTERNAL_ERROR: Error retrieving sprints boards: GraphQL error occurred`;

export const TECHNICAL_REFERENCE =
  'Sprint Operations (all require correct board pair): Add to Sprint: Update `task_sprint` column with sprint item ID. Remove from Sprint: Clear `task_sprint` column (set to null). Search in Sprint: Filter where `task_sprint` equals sprint item ID. Move Between Sprints: Update `task_sprint` with new sprint item ID. Backlog Tasks: `task_sprint` is empty/null. Critical: `task_sprint` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.';
