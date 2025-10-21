import {
  GetSprintsBoardItemsWithColumnsQuery,
  GetBoardSchemaQuery,
  ColumnType,
} from '../../../../monday-graphql/generated/graphql';

export const VALID_SPRINTS_BOARD_SCHEMA: GetBoardSchemaQuery = {
  boards: [
    {
      columns: [
        { id: 'sprint_tasks', type: ColumnType.BoardRelation, title: 'Sprint Tasks' },
        { id: 'sprint_timeline', type: ColumnType.Timeline, title: 'Sprint Timeline' },
        { id: 'sprint_completion', type: ColumnType.Checkbox, title: 'Sprint Completion' },
        { id: 'sprint_start_date', type: ColumnType.Date, title: 'Sprint Start Date' },
        { id: 'sprint_end_date', type: ColumnType.Date, title: 'Sprint End Date' },
        { id: 'sprint_activation', type: ColumnType.Checkbox, title: 'Sprint Activation' },
        { id: 'sprint_summary', type: ColumnType.Doc, title: 'Sprint Summary' },
        { id: 'sprint_capacity', type: ColumnType.Text, title: 'Sprint Capacity' },
      ],
      groups: [],
    },
  ],
};

export const REALISTIC_SPRINTS_RESPONSE: GetSprintsBoardItemsWithColumnsQuery = {
  boards: [
    {
      items_page: {
        items: [
          // Planned Sprint (not started)
          {
            id: '1001',
            name: 'Sprint 25',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: false,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: false,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: null },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: null },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: null,
                to: null,
              },
              { __typename: 'DocValue' as const, id: 'sprint_summary', type: ColumnType.Doc, file: null },
            ],
          },
          // Planned Sprint (with timeline)
          {
            id: '1002',
            name: 'Sprint 24',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: false,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: false,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: null },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: null },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: '2025-09-21T00:00:00Z',
                to: '2025-10-19T00:00:00Z',
              },
              { __typename: 'DocValue' as const, id: 'sprint_summary', type: ColumnType.Doc, file: null },
            ],
          },
          // Active Sprint
          {
            id: '1003',
            name: 'Sprint 23',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: true,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: false,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: '2025-09-14' },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: null },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: '2025-09-14T00:00:00Z',
                to: '2025-09-28T00:00:00Z',
              },
              { __typename: 'DocValue' as const, id: 'sprint_summary', type: ColumnType.Doc, file: null },
            ],
          },
          // Completed Sprint (with summary document)
          {
            id: '1004',
            name: 'Sprint 22',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: true,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: true,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: '2025-08-18' },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: '2025-09-08' },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: '2025-08-17T00:00:00Z',
                to: '2025-08-31T00:00:00Z',
              },
              {
                __typename: 'DocValue' as const,
                id: 'sprint_summary',
                type: ColumnType.Doc,
                file: { doc: { object_id: 'doc_summary_1004' } },
              },
            ],
          },
          // Completed Sprint (without summary document)
          {
            id: '1005',
            name: 'Sprint 21',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: true,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: true,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: '2025-08-03' },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: '2025-08-18' },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: '2025-08-03T00:00:00Z',
                to: '2025-08-16T00:00:00Z',
              },
              { __typename: 'DocValue' as const, id: 'sprint_summary', type: ColumnType.Doc, file: null },
            ],
          },
        ],
      },
    },
  ],
};

export const EMPTY_SPRINTS_RESPONSE: GetSprintsBoardItemsWithColumnsQuery = {
  boards: [
    {
      items_page: {
        items: [],
      },
    },
  ],
};

export const INVALID_BOARD_SCHEMA: GetBoardSchemaQuery = {
  boards: [
    {
      columns: [
        { id: 'some_other_column', type: ColumnType.Text, title: 'Other Column' },
        { id: 'another_column', type: ColumnType.Status, title: 'Status' },
      ],
      groups: [],
    },
  ],
};

export const NO_BOARD_FOUND_RESPONSE: GetBoardSchemaQuery = {
  boards: [],
};

/**
 * Sprints with missing timeline values for edge case testing
 */
export const SPRINTS_WITH_MISSING_TIMELINE: GetSprintsBoardItemsWithColumnsQuery = {
  boards: [
    {
      items_page: {
        items: [
          {
            id: '111',
            name: 'Sprint Without Timeline',
            column_values: [
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_activation',
                type: ColumnType.Checkbox,
                checked: false,
              },
              {
                __typename: 'CheckboxValue' as const,
                id: 'sprint_completion',
                type: ColumnType.Checkbox,
                checked: false,
              },
              { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: null },
              { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: null },
              {
                __typename: 'TimelineValue' as const,
                id: 'sprint_timeline',
                type: ColumnType.Timeline,
                from: null,
                to: null,
              },
              { __typename: 'DocValue' as const, id: 'sprint_summary', type: ColumnType.Doc, file: null },
            ],
          },
        ],
      },
    },
  ],
};

/**
 * Malformed board response with null columns
 */
export const MALFORMED_BOARD_RESPONSE: GetBoardSchemaQuery = {
  boards: [
    {
      columns: null as any,
      groups: [],
    },
  ],
};

/**
 * Expected markdown report output for realistic sprints response
 */
export const EXPECTED_SPRINTS_REPORT_OUTPUT = `**Total Sprints:** 5

| Sprint Name | Sprint ID | Status | Timeline (Planned) | Start Date (Actual) | End Date (Actual) | Completion | Summary Document ObjectID |
|-------------|-----------|--------|--------------------|---------------------|-------------------|------------|---------------------------|
| Sprint 25 | 1001 | PLANNED | Not set | Not started | Not ended | No | No document |
| Sprint 24 | 1002 | PLANNED | 2025-09-21 to 2025-10-19 | Not started | Not ended | No | No document |
| Sprint 23 | 1003 | ACTIVE | 2025-09-14 to 2025-09-28 | 2025-09-14 | Not ended | No | No document |
| Sprint 22 | 1004 | COMPLETED | 2025-08-17 to 2025-08-31 | 2025-08-18 | 2025-09-08 | Yes | doc_summary_1004 |
| Sprint 21 | 1005 | COMPLETED | 2025-08-03 to 2025-08-16 | 2025-08-03 | 2025-08-18 | Yes | No document |

## Status Definitions:
- **PLANNED**: Sprint not yet started (no activation, no start date)
- **ACTIVE**: Sprint is active (activated but not completed)
- **COMPLETED**: Sprint is finished`;
