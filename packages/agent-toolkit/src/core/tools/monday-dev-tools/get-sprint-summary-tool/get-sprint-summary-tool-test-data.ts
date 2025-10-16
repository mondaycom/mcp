import {
  GetSprintsByIdsQuery,
  ReadDocsQuery,
  ExportMarkdownFromDocQuery,
  ColumnType,
} from '../../../../monday-graphql/generated/graphql';

export const VALID_SPRINT_WITH_SUMMARY: GetSprintsByIdsQuery = {
  items: [
    {
      id: '1004',
      name: 'Sprint 22',
      board: {
        id: '2001',
      },
      column_values: [
        { __typename: 'BoardRelationValue' as const, id: 'sprint_tasks', type: ColumnType.BoardRelation },
        { __typename: 'CheckboxValue' as const, id: 'sprint_activation', type: ColumnType.Checkbox, checked: true },
        { __typename: 'CheckboxValue' as const, id: 'sprint_completion', type: ColumnType.Checkbox, checked: true },
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
          file: { doc: { object_id: 'doc_obj_summary_1004' } },
        },
      ],
    },
  ],
};

export const SPRINT_WITHOUT_SUMMARY: GetSprintsByIdsQuery = {
  items: [
    {
      id: '1003',
      name: 'Sprint 23 - Active',
      board: {
        id: '2001',
      },
      column_values: [
        { __typename: 'BoardRelationValue' as const, id: 'sprint_tasks', type: ColumnType.BoardRelation },
        { __typename: 'CheckboxValue' as const, id: 'sprint_activation', type: ColumnType.Checkbox, checked: true },
        { __typename: 'CheckboxValue' as const, id: 'sprint_completion', type: ColumnType.Checkbox, checked: false },
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
  ],
};

export const VALID_DOC_RESPONSE: ReadDocsQuery = {
  docs: [
    {
      id: 'doc_internal_1004',
      object_id: 'doc_obj_summary_1004',
    } as any,
  ],
};

export const EMPTY_DOC_RESPONSE: ReadDocsQuery = {
  docs: [],
};

export const REALISTIC_SPRINT_SUMMARY_MARKDOWN: ExportMarkdownFromDocQuery = {
  export_markdown_from_doc: {
    success: true,
    markdown: ` 🗓️ Aug 17 - 31

 

| ## **Highlights**
 In Sprint 22, the team committed to 90 tasks but completed only 66, resulting in a velocity of 73.3%. The sprint included 94 planned tasks, 41 unplanned tasks, and 16 tasks removed, indicating a significant amount of unplanned work that may have impacted the team's ability to meet their commitments. |
| --- |

 

## ✅  **Completed Tasks**

### 
Velocity 📊

-  **Completed: **66 tasks (26.6 SP)


-  **Committed: **90 tasks (39.05 SP)


 

### Completed by type 🔖

-  **Growth/Test:** 17 tasks - 10.2 SP


-  **Design:** 1 tasks


-  **Infrastructure:** 1 tasks - 0.2 SP


-  **Improvement:** 5 tasks - 0.2 SP


-  **Bug 🐞:** 5 tasks - 2 SP


-  **Quality 🥷:** 1 tasks - 0.1 SP


-  **Run the Business:** 1 tasks - 0.5 SP


-  **Other:** 7 tasks - 1.1 SP


-  **Feature:** 32 tasks - 14.4 SP


 

### Completed by Assignee **🧑‍💻**

-  @user-12345001 15 tasks - 4.7 SP


-  @user-12345002 1 tasks


-  @user-12345003 1 tasks


-  @user-12345004 0 tasks


-  @user-12345005 6 tasks - 4.6 SP


-  @user-12345006 14 tasks - 5.8 SP


-  @user-12345007 0 tasks


-  @user-12345008 0 tasks


-  @user-12345009 16 tasks - 4.9 SP


-  @user-12345010 11 tasks - 4.2 SP


-  @user-12345011 5 tasks - 4.5 SP


-  @user-12345012 0 tasks


-  @user-12345013 3 tasks - 1 SP


-  @user-12345014 1 tasks

 


 

### Completed by Priority **🚥**

-  **High:** 30 tasks - 14.1 SP


-  **Missing priority:** 5 tasks - 0.5 SP


-  **Critical:** 22 tasks - 8.8 SP


-  **Medium:** 12 tasks - 5.2 SP


-  **Low:** 1 tasks - 0.1 SP


 

## **📌** **Unplanned tasks**

-  [Authentication service - do this do that(/boards/2001001/pulses/3001001) - Done, Infrastructure, 0.2 SP 


-  [Cloud migration - infra resources ](/boards/2001001/pulses/3001002) - Merged, Improvement 


-  [Header button alignment fix](/boards/2001001/pulses/3001003) - Done, Bug 🐞, 1 SP 


-  [Migration for production cluster](/boards/2001001/pulses/3001004) - Waiting for review, Quality 🥷, 1 SP 


-  [Sprint management - external secrets](/boards/2001001/pulses/3001005) - Done, Other 


 

## ⚡ **Recommended action items**

-  **Conduct a retrospective focused on task removal reasons**: With 16 tasks removed this sprint, it is crucial to understand why these tasks were not completed. A dedicated retrospective session could help identify patterns and prevent similar issues in future sprints.


-  **Enhance collaboration between roles**: The sprint involved multiple roles (Dev, Design, Product), and improving collaboration could streamline processes. For instance, regular check-ins between designers and developers could help ensure that design tasks are not blocked.


-  **Implement a daily stand-up to address blockers**: Given the number of tasks that were 'Blocked' or 'On Hold', a daily stand-up could help the team quickly identify and address blockers, ensuring smoother progress throughout the sprint.


-  **Reduce the number of unplanned tasks in the next sprint**: With 41 unplanned tasks this sprint, the team should analyze the causes of these unplanned tasks and implement strategies to minimize them. For example, conducting a pre-sprint planning session to identify potential risks could help.


-  **Review and adjust the sprint planning process**: The high number of planned tasks (94) versus completed tasks (66) suggests that the planning process may need adjustment. The team should consider reducing the number of planned tasks to a more manageable level based on past performance.


-  **Prioritize high-impact tasks more effectively**: Several critical tasks were completed, but the high number of unplanned tasks suggests that prioritization may have been lacking. The team should adopt a prioritization framework to ensure that the most impactful tasks are addressed first.


-  **Improve task estimation accuracy**: The team completed only 66 out of 90 committed tasks, indicating a gap in estimation. Team members should review past sprints to refine their estimation techniques, possibly using historical data to inform future commitments.


 

 

|  **🤖 **This sprint summary was AI-generated for quick insights - [Give feedback](https://forms.monday.com/forms/feedback-form) |
| --- |

 `,
    error: null,
  },
};

export const FAILED_MARKDOWN_EXPORT: ExportMarkdownFromDocQuery = {
  export_markdown_from_doc: {
    success: false,
    markdown: null,
    error: 'Export failed due to document corruption',
  },
};

export const EMPTY_MARKDOWN_EXPORT: ExportMarkdownFromDocQuery = {
  export_markdown_from_doc: {
    success: true,
    markdown: null,
    error: null,
  },
};

/**
 * Markdown export with empty string
 */
export const EMPTY_STRING_MARKDOWN_EXPORT: ExportMarkdownFromDocQuery = {
  export_markdown_from_doc: {
    success: true,
    markdown: '',
    error: null,
  },
};

/**
 * Sprint not found - empty items array
 */
export const SPRINT_NOT_FOUND_RESPONSE: GetSprintsByIdsQuery = {
  items: [],
};

/**
 * Invalid document response - document with null properties
 */
export const INVALID_DOC_RESPONSE: ReadDocsQuery = {
  docs: [
    {
      id: 'invalid_doc',
      object_id: null as any,
    } as any,
  ],
};

/**
 * Document response with null items in array
 */
export const NULL_DOC_IN_ARRAY_RESPONSE: ReadDocsQuery = {
  docs: [null] as any,
};

/**
 * Sprint with null object_id in document
 */
export const SPRINT_WITH_NULL_DOC_OBJECT_ID: GetSprintsByIdsQuery = {
  items: [
    {
      id: '333',
      name: 'Sprint 3',
      board: { id: '123456789' },
      column_values: [
        { __typename: 'BoardRelationValue' as const, id: 'sprint_tasks', type: ColumnType.BoardRelation },
        { __typename: 'CheckboxValue' as const, id: 'sprint_activation', type: ColumnType.Checkbox, checked: true },
        { __typename: 'CheckboxValue' as const, id: 'sprint_completion', type: ColumnType.Checkbox, checked: true },
        { __typename: 'DateValue' as const, id: 'sprint_start_date', type: ColumnType.Date, date: '2025-01-01' },
        { __typename: 'DateValue' as const, id: 'sprint_end_date', type: ColumnType.Date, date: '2025-01-14' },
        {
          __typename: 'TimelineValue' as const,
          id: 'sprint_timeline',
          type: ColumnType.Timeline,
          from: '2025-01-01T00:00:00Z',
          to: '2025-01-14T00:00:00Z',
        },
        {
          __typename: 'DocValue' as const,
          id: 'sprint_summary',
          type: ColumnType.Doc,
          file: { doc: { object_id: null as any } },
        },
      ],
    },
  ],
};

/**
 * Sprint missing required columns for validation testing
 */
export const SPRINT_MISSING_COLUMNS: GetSprintsByIdsQuery = {
  items: [
    {
      id: '444',
      name: 'Invalid Sprint',
      board: { id: '123456789' },
      column_values: [
        { __typename: 'CheckboxValue' as const, id: 'sprint_activation', type: ColumnType.Checkbox, checked: true },
        // Missing other required columns
      ],
    },
  ],
};
