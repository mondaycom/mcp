import { GetBoardInfoQuery } from '../../../../monday-graphql/generated/graphql';

export type BoardInfoData = NonNullable<NonNullable<GetBoardInfoQuery['boards']>[0]>;

export const formatBoardInfo = (board: BoardInfoData): string => {
  const sections: string[] = [];

  // Basic Information
  sections.push(`# Board Information\n`);
  sections.push(`**Name:** ${board?.name || 'N/A'}`);
  sections.push(`**ID:** ${board?.id || 'N/A'}`);
  sections.push(`**Description:** ${board?.description || 'No description'}`);
  sections.push(`**State:** ${board?.state || 'N/A'}`);
  sections.push(`**Kind:** ${board?.board_kind || 'N/A'}`);
  sections.push(`**URL:** ${board?.url || 'N/A'}`);
  sections.push(`**Updated:** ${board?.updated_at || 'N/A'}`);
  sections.push(`**Item Terminology:** ${board?.item_terminology || 'items'}`);
  sections.push(`**Items Count:** ${board?.items_count || 0}`);
  sections.push(`**Items Limit:** ${board?.items_limit || 'No limit'}`);
  sections.push(`**Board Folder ID:** ${board?.board_folder_id || 'None'}`);

  // Creator Information
  if (board?.creator) {
    sections.push(`\n## Creator`);
    sections.push(`**Name:** ${board.creator.name || 'N/A'}`);
    sections.push(`**ID:** ${board.creator.id || 'N/A'}`);
    sections.push(`**Email:** ${board.creator.email || 'N/A'}`);
  }

  // Workspace Information
  if (board?.workspace) {
    sections.push(`\n## Workspace`);
    sections.push(`**Name:** ${board.workspace.name || 'N/A'}`);
    sections.push(`**ID:** ${board.workspace.id || 'N/A'}`);
    sections.push(`**Kind:** ${board.workspace.kind || 'N/A'}`);
    sections.push(`**Description:** ${board.workspace.description || 'No description'}`);
  }

  // Owners
  if (board?.owners && board.owners.length > 0) {
    sections.push(`\n## Board Owners`);
    board.owners.forEach((owner, index: number) => {
      if (owner) {
        sections.push(`${index + 1}. **${owner.name || 'N/A'}** (ID: ${owner.id || 'N/A'})`);
      }
    });
  }

  // Team Owners
  if (board?.team_owners && board.team_owners.length > 0) {
    sections.push(`\n## Team Owners`);
    board.team_owners.forEach((team, index: number) => {
      if (team) {
        sections.push(`${index + 1}. **${team.name || 'N/A'}** (ID: ${team.id || 'N/A'})`);
      }
    });
  }

  // Groups
  if (board?.groups && board.groups.length > 0) {
    sections.push(`\n## Groups`);
    board.groups.forEach((group, index: number) => {
      if (group) {
        sections.push(`${index + 1}. **${group.title || 'Untitled'}** (ID: ${group.id || 'N/A'})`);
      }
    });
  }

  // Top Group
  if (board?.top_group) {
    sections.push(`\n## Top Group`);
    sections.push(`**ID:** ${board.top_group.id || 'N/A'}`);
  }

  // Columns
  if (board?.columns && board.columns.length > 0) {
    sections.push(`\n## Columns`);
    board.columns.forEach((column, index: number) => {
      if (column) {
        sections.push(`${index + 1}. **${column.title || 'Untitled'}** (${column.type || 'unknown'})`);
        sections.push(`   - **ID:** ${column.id || 'N/A'}`);
        if (column.description) {
          sections.push(`   - **Description:** ${column.description}`);
        }
        if (column.settings_str) {
          sections.push(`   - **Settings:** ${column.settings_str}`);
        }
      }
    });
  }

  // Tags
  if (board?.tags && board.tags.length > 0) {
    sections.push(`\n## Tags`);
    board.tags.forEach((tag, index: number) => {
      if (tag) {
        sections.push(`${index + 1}. **${tag.name || 'N/A'}** (ID: ${tag.id || 'N/A'})`);
      }
    });
  }

  // Permissions
  if (board?.permissions) {
    sections.push(`\n## Permissions`);
    sections.push(`${board.permissions}`);
  }

  if (board?.columns) {
    sections.push(getColumnFilteringGuidelines(board.columns!.filter(isBaseColumnInfo) as BaseColumnInfo[]));
  }
  
  return sections.join('\n');
};

interface BaseColumnInfo {
  id: string;
  type: string;
}

function isBaseColumnInfo(column: object | null): column is BaseColumnInfo {
  const requiredKeys: (keyof BaseColumnInfo)[] = ['id', 'type'];
  return !!column && requiredKeys.every(key => key in column);
}

const filteringGuidelinesByColumnType: Record<string, string> = {
  'last_updated': `Supported operators: any_of, not_any_of. CompareValue should be either:
  - "TODAY" - requires to also specify compareAttribute: "UPDATED_AT"
  - "YESTERDAY" - requires to also specify compareAttribute: "UPDATED_AT"
  - "THIS_WEEK" - requires to also specify compareAttribute: "UPDATED_AT"
  - "LAST_WEEK" - requires to also specify compareAttribute: "UPDATED_AT"
  - "THIS_MONTH" - requires to also specify compareAttribute: "UPDATED_AT"
  - "LAST_MONTH" - requires to also specify compareAttribute: "UPDATED_AT"
EXAMPLES:
  ✅ Correct: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of", "compareAttribute": "UPDATED_AT"} // using TODAY with correct compareAttribute
  ✅ Correct: {"columnId": "last_updated", "compareValue": ["THIS_WEEK"], "operator": "not_any_of", "compareAttribute": "UPDATED_AT"} // using THIS_WEEK with not_any_of
  ❌ Wrong: {"columnId": "last_updated", "compareValue": ["TODAY"], "operator": "any_of"} // missing required compareAttribute
  ❌ Wrong: {"columnId": "last_updated", "compareValue": "TODAY", "operator": "any_of", "compareAttribute": "UPDATED_AT"} // not using array for any_of operator`,

    'date': `Supported operators: any_of, not_any_of, greater_than, lower_than. CompareValue should be either:
  - Date in "YYYY-MM-DD" format must be passed along with "EXACT" string e.g. compareValue:["2025-01-01", "EXACT"]
  - "TODAY" - Item with today's date
  - "TOMORROW" - Item with tomorrow's date
  - "THIS_WEEK" - Item with this week's date
  - "ONE_WEEK_AGO" - Item with one week ago's date
EXAMPLES:
  ✅ Correct: {"columnId": "date", "compareValue": ["2025-01-01", "EXACT"], "operator": "any_of"} // using exact date format with EXACT
  ✅ Correct: {"columnId": "date", "compareValue": "TODAY", "operator": "greater_than"} // using TODAY with greater_than
  ❌ Wrong: {"columnId": "date", "compareValue": "2025-01-01", "operator": "any_of"} // missing EXACT string for exact date
  ❌ Wrong: {"columnId": "date", "compareValue": ["TODAY"], "operator": "greater_than"} // using array with single value operator`,

    'email': `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be:
  - empty string "" when searching for blank values
  - whole email address when searching for specific email
  - partial email when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "email", "compareValue": ["john@example.com"], "operator": "any_of"} // using array with any_of for specific email
  ✅ Correct: {"columnId": "email", "compareValue": "gmail", "operator": "contains_text"} // using partial email with contains_text
  ❌ Wrong: {"columnId": "email", "compareValue": "john@example.com", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "email", "compareValue": ["gmail"], "operator": "contains_text"} // using array with single value operator`,

    'long_text': `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "long_text", "compareValue": ["Complete project description"], "operator": "any_of"} // using array with any_of for full text
  ✅ Correct: {"columnId": "long_text", "compareValue": "urgent", "operator": "contains_text"} // using partial text with contains_text
  ❌ Wrong: {"columnId": "long_text", "compareValue": "Complete project description", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "long_text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator`,

    'text': `Supported operators: any_of, not_any_of, is_empty, is_not_empty, contains_text, not_contains_text. CompareValue can be either full text or partial text when using contains_text, not_contains_text operators
EXAMPLES:
  ✅ Correct: {"columnId": "text", "compareValue": ["Task Name"], "operator": "any_of"} // using array with any_of for full text
  ✅ Correct: {"columnId": "text", "compareValue": "bug", "operator": "contains_text"} // using partial text with contains_text
  ❌ Wrong: {"columnId": "text", "compareValue": "Task Name", "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "text", "compareValue": [], "operator": "contains_text"} // using empty array with contains_text operator`,

    'numbers': `Supported operators: any_of, not_any_of, greater_than, lower_than. CompareValue is a number or "$$$blank$$$" when searching for blank values
EXAMPLES:
  ✅ Correct: {"columnId": "numbers", "compareValue": [100, 200], "operator": "any_of"} // using array with any_of for multiple numbers
  ✅ Correct: {"columnId": "numbers", "compareValue": 50, "operator": "greater_than"} // using single number with greater_than
  ❌ Wrong: {"columnId": "numbers", "compareValue": 100, "operator": "any_of"} // not using array with any_of operator
  ❌ Wrong: {"columnId": "numbers", "compareValue": ["50"], "operator": "greater_than"} // using array with single value operator`,

    'name': `Supported operators: "contains_text", "not_contains_text". CompareValue can be full or partial text
EXAMPLES:
  ✅ Correct: {"columnId": "name", "compareValue": "marketing campaign", "operator": "contains_text"} // using string with contains_text
  ✅ Correct: {"columnId": "name", "compareValue": "marketing campaign", "operator": "not_contains_text"} // using string with not_contains_text`,

    'status': `Supported operators: any_of, not_any_of, contains_terms. CompareValue should be either:
  - index of label from column settings - when used with any_of, not_any_of operators
  - label's text - when use with contains_terms
EXAMPLES:
  ✅ Correct: {"columnId": "status", "compareValue": [0, 1], "operator": "any_of"} // Using index values
  ✅ Correct: {"columnId": "status", "compareValue": "Done", "operator": "contains_terms"} // Using label text
  ❌ Wrong: {"columnId": "status", "compareValue": "Done", "operator": "any_of"} // Using label text with wrong operator
  ❌ Wrong: {"columnId": "status", "compareValue": [0, 1], "operator": "contains_terms"} // Using index with wrong operator`,

    'checkbox': `Supported operators: is_empty, is_not_empty. Compare value must be an empty array
EXAMPLES:
  ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
  ❌ Wrong: {"columnId": "column_id", "compareValue": null, "operator": "is_empty"} // not using empty array with is_empty operator`,

    'people': `Supported operators: any_of, not_any_of, is_empty, is_not_empty. **CRITICAL**: CompareValue MUST be in one of following:
  - "assigned_to_me" - when searching for current user
  - "person-123" - when searching for specific person with id 123
  - "team-456" - when searching for specific team with id 456
  - empty array when using is_empty, is_not_empty operators
EXAMPLES: 
  ✅ Correct: {"columnId": "column_id", "compareValue": [], "operator": "is_empty"} // using empty array with is_empty operator
  ✅ Correct: {"columnId": "column_id", "compareValue": ["person-80120403"], "operator": "any_of"} // using person prefix
  ✅ Correct: {"columnId": "column_id", "compareValue": ["team-9000"], "operator": "any_of"} // using team prefix
  ✅ Correct: {"columnId": "column_id", "compareValue": ["assigned_to_me"], "operator": "any_of"} // using assigned_to_me value
  ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "is_empty"} // using id with is_empty operator
  ❌ Wrong: {"columnId": "column_id", "compareValue": ["80120403"], "operator": "any_of"} // not using person or team prefix`,
}

const getColumnFilteringGuidelines = (columns: BaseColumnInfo[]) => {
  const columnIdsByType = columns.reduce((acc, column) => {
    if(!filteringGuidelinesByColumnType[column.type]) {
      return acc;
    }

    if (!acc[column.type]) {
      acc[column.type] = [];
    }
    
    acc[column.type].push(column.id);
    return acc;
  }, {} as Record<string, string[]>);


  return Object.keys(columnIdsByType).length  === 0 ? '' : `
# Filtering Guidelines

## [IMPORTANT] Operator Guidelines
Specific operators expect specific compareValue types:
- CompareValue MUST BE SENT AS AN ARRAY WHEN USED WITH  any_of, not_any_of, between operators
- CompareValue MUST BE SENT AS AN EMPTY ARRAY WHEN USED WITH is_empty, is_not_empty
- CompareValue MUST BE SENT AS EITHER SINGLE STRING OR SINGLE NUMBER WHEN USED WITH greater_than, greater_than_or_equals, lower_than, lower_than_or_equal
- CompareValue MUST BE SENT AS SINGLE STRING WHEN USED WITH contains_terms, not_contains_text, contains_text, starts_with, ends_with operators

## Column type Guidelines
${Object.entries(columnIdsByType).map(([type, columnIds]) => {
  return `- Column Type: ${type} (Column IDs: ${columnIds.join(', ')}) - ${filteringGuidelinesByColumnType[type]}`;
}).join('\n\n')}
  `
};