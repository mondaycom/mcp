import {
  GetRecentBoardsQuery,
  ColumnType,
} from '../../../../monday-graphql/generated/graphql';

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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2002'] },
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['1002'] },
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2001'] }, // References board not in the list
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['1001'] }, // References board not in the list
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardId: '2001' }, // Using boardId instead of boardIds
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardId: '1001' },
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
        { id: 'sprint_completion', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_start_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_end_date', type: ColumnType.Date, settings: {} },
        { id: 'sprint_activation', type: ColumnType.Checkbox, settings: {} },
        { id: 'sprint_summary', type: ColumnType.Doc, settings: {} },
        { id: 'sprint_capacity', type: ColumnType.Text, settings: {} },
      ],
    },
    {
      id: '2001',
      name: 'Tasks Board',
      workspace: null,
      columns: [
        {
          id: 'task_sprint',
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['1001'] },
        },
        { id: 'task_status', type: ColumnType.Status, settings: {} },
        { id: 'task_epic', type: ColumnType.BoardRelation, settings: {} },
        { id: 'task_estimation', type: ColumnType.Numbers, settings: {} },
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
          type: ColumnType.BoardRelation,
          settings: { boardIds: ['2001'] },
        },
        { id: 'sprint_timeline', type: ColumnType.Timeline, settings: {} },
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
          type: ColumnType.BoardRelation,
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
        { id: 'status', type: ColumnType.Status, settings: {} },
        { id: 'owner', type: ColumnType.People, settings: {} },
        { id: 'date', type: ColumnType.Date, settings: {} },
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
        { id: 'client_name', type: ColumnType.Text, settings: {} },
        { id: 'deal_value', type: ColumnType.Numbers, settings: {} },
        { id: 'stage', type: ColumnType.Status, settings: {} },
      ],
    },
  ],
};

/**
 * Expected output content for various scenarios
 */

export const EXPECTED_SINGLE_PAIR_OUTPUT = `# Monday-Dev Sprints Boards Discovery

## Boards

Found **1** matched pair(s):

### Pair 1
**Sprints Board:**
- ID: \`1001\`
- Name: Sprints Board
- Workspace: Development Team (ID: ws_1)

**Tasks Board:**
- ID: \`2001\`
- Name: Tasks Board
- Workspace: Development Team (ID: ws_1)
---

## 📋 Technical Reference

**Sprint Operations** (all require correct board pair):
• Add to Sprint: Update \`task_sprint\` column with sprint item ID
• Remove from Sprint: Clear \`task_sprint\` column (set to null)
• Search in Sprint: Filter where \`task_sprint\` equals sprint item ID
• Move Between Sprints: Update \`task_sprint\` with new sprint item ID
• Backlog Tasks: \`task_sprint\` is empty/null

**Critical:** \`task_sprint\` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.`;

export const EXPECTED_MULTIPLE_PAIRS_OUTPUT = `# Monday-Dev Sprints Boards Discovery

## ⚠️ Multiple SprintsBoard Detected
**2** different board pairs found. Each pair is isolated and workspace-specific.
**AI Agent - REQUIRED:** Before ANY operation, confirm with user which pair and workspace to use.
---
## Boards

Found **2** matched pair(s):

### Pair 1
**Sprints Board:**
- ID: \`1001\`
- Name: Frontend Sprints
- Workspace: Frontend Team (ID: ws_frontend)

**Tasks Board:**
- ID: \`2001\`
- Name: Frontend Tasks
- Workspace: Frontend Team (ID: ws_frontend)
---

### Pair 2
**Sprints Board:**
- ID: \`1002\`
- Name: Backend Sprints
- Workspace: Backend Team (ID: ws_backend)

**Tasks Board:**
- ID: \`2002\`
- Name: Backend Tasks
- Workspace: Backend Team (ID: ws_backend)
---

## 📋 Technical Reference

**Sprint Operations** (all require correct board pair):
• Add to Sprint: Update \`task_sprint\` column with sprint item ID
• Remove from Sprint: Clear \`task_sprint\` column (set to null)
• Search in Sprint: Filter where \`task_sprint\` equals sprint item ID
• Move Between Sprints: Update \`task_sprint\` with new sprint item ID
• Backlog Tasks: \`task_sprint\` is empty/null

**Critical:** \`task_sprint\` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.`;

export const EXPECTED_SPRINTS_BOARD_ONLY_OUTPUT = `# Monday-Dev Sprints Boards Discovery

## Boards

Found **1** matched pair(s):

### Pair 1
**Sprints Board:**
- ID: \`1001\`
- Name: Sprints Board
- Workspace: Development Team (ID: ws_1)

**Tasks Board:**
- ID: \`2001\`
- Name: Tasks Board 2001
- Workspace: Unknown (ID: unknown)
---

## 📋 Technical Reference

**Sprint Operations** (all require correct board pair):
• Add to Sprint: Update \`task_sprint\` column with sprint item ID
• Remove from Sprint: Clear \`task_sprint\` column (set to null)
• Search in Sprint: Filter where \`task_sprint\` equals sprint item ID
• Move Between Sprints: Update \`task_sprint\` with new sprint item ID
• Backlog Tasks: \`task_sprint\` is empty/null

**Critical:** \`task_sprint\` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.`;

export const EXPECTED_TASKS_BOARD_ONLY_OUTPUT = `# Monday-Dev Sprints Boards Discovery

## Boards

Found **1** matched pair(s):

### Pair 1
**Sprints Board:**
- ID: \`1001\`
- Name: Sprints Board 1001
- Workspace: Unknown (ID: unknown)

**Tasks Board:**
- ID: \`2001\`
- Name: Tasks Board
- Workspace: Development Team (ID: ws_1)
---

## 📋 Technical Reference

**Sprint Operations** (all require correct board pair):
• Add to Sprint: Update \`task_sprint\` column with sprint item ID
• Remove from Sprint: Clear \`task_sprint\` column (set to null)
• Search in Sprint: Filter where \`task_sprint\` equals sprint item ID
• Move Between Sprints: Update \`task_sprint\` with new sprint item ID
• Backlog Tasks: \`task_sprint\` is empty/null

**Critical:** \`task_sprint\` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.`;

export const EXPECTED_NO_BOARDS_ERROR = `BOARD_NOT_FOUND: No boards found in your account. Please verify you have access to monday.com boards.`;

export const EXPECTED_NO_VALID_PAIRS_MESSAGE = `## No Monday-Dev Sprints Board Pairs Found

**Boards Checked:** 2 (recently used)

No board pairs with sprint relationships found in your recent boards.

### Possible Reasons:
1. Boards exist but not accessed recently by your account
2. Missing access permissions to sprint/task boards
3. Monday-dev product was not set up in account

### Next Steps:
1. Ask user to access monday-dev boards in UI to refresh recent boards list
2. Ask user to verify permissions to view sprint and task boards
3. Ask user to provide board IDs manually if known`;

export const EXPECTED_BOARDS_WITHOUT_WORKSPACE_OUTPUT = `# Monday-Dev Sprints Boards Discovery

## Boards

Found **1** matched pair(s):

### Pair 1
**Sprints Board:**
- ID: \`1001\`
- Name: Sprints Board
- Workspace: Unknown (ID: unknown)

**Tasks Board:**
- ID: \`2001\`
- Name: Tasks Board
- Workspace: Unknown (ID: unknown)
---

## 📋 Technical Reference

**Sprint Operations** (all require correct board pair):
• Add to Sprint: Update \`task_sprint\` column with sprint item ID
• Remove from Sprint: Clear \`task_sprint\` column (set to null)
• Search in Sprint: Filter where \`task_sprint\` equals sprint item ID
• Move Between Sprints: Update \`task_sprint\` with new sprint item ID
• Backlog Tasks: \`task_sprint\` is empty/null

**Critical:** \`task_sprint\` column references ONLY its paired sprints board. Cross-pair operations WILL FAIL.`;

export const EXPECTED_GRAPHQL_ERROR = `INTERNAL_ERROR: Error retrieving sprints boards: GraphQL error occurred`;

