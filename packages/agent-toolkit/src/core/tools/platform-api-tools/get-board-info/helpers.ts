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

  return sections.join('\n');
};
