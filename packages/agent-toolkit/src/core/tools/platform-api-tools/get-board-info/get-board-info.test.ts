import { formatBoardInfo, BoardInfoData } from './helpers';
import { State, BoardKind, WorkspaceKind, ColumnType } from '../../../../monday-graphql/generated/graphql';

describe('formatBoardInfo - Simple Tests', () => {
  it('should format basic board information correctly', () => {
    const mockBoard: BoardInfoData = {
      id: '123456789',
      name: 'Test Board',
      description: 'A test board for unit testing',
      state: State.Active,
      board_kind: BoardKind.Public,
      permissions: 'write',
      url: 'https://monday.com/boards/123456789',
      updated_at: '2024-01-15T10:30:00Z',
      item_terminology: 'tasks',
      items_count: 25,
      items_limit: 100,
      board_folder_id: 'folder_123',
      creator: {
        id: 'creator_1',
        name: 'John Doe',
        email: 'john.doe@example.com',
      },
      workspace: {
        id: 'workspace_1',
        name: 'Development Team',
        kind: WorkspaceKind.Open,
        description: 'Main development workspace',
      },
      owners: [
        { id: 'owner_1', name: 'Alice Smith' },
        { id: 'owner_2', name: 'Bob Johnson' },
      ],
      team_owners: [{ id: 'team_1', name: 'Frontend Team', picture_url: 'https://example.com/pic1.jpg' }],
      groups: [
        { id: 'group_1', title: 'To Do' },
        { id: 'group_2', title: 'In Progress' },
      ],
      top_group: {
        id: 'top_group_1',
      },
      columns: [
        {
          id: 'col_1',
          title: 'Task Name',
          description: 'The name of the task',
          type: ColumnType.Text,
          settings_str: '{"width": 200}',
        },
        {
          id: 'col_2',
          title: 'Status',
          description: undefined,
          type: ColumnType.Status,
          settings_str: '{"labels": ["Not Started", "In Progress", "Done"]}',
        },
      ],
      tags: [
        { id: 'tag_1', name: 'urgent' },
        { id: 'tag_2', name: 'bug-fix' },
      ],
    } as BoardInfoData;

    const result = formatBoardInfo(mockBoard);

    // Test basic information section
    expect(result).toContain('# Board Information');
    expect(result).toContain('**Name:** Test Board');
    expect(result).toContain('**ID:** 123456789');
    expect(result).toContain('**Description:** A test board for unit testing');
    expect(result).toContain('**State:** active');
    expect(result).toContain('**Kind:** public');
    expect(result).toContain('**URL:** https://monday.com/boards/123456789');
    expect(result).toContain('**Updated:** 2024-01-15T10:30:00Z');
    expect(result).toContain('**Item Terminology:** tasks');
    expect(result).toContain('**Items Count:** 25');
    expect(result).toContain('**Items Limit:** 100');
    expect(result).toContain('**Board Folder ID:** folder_123');

    // Test creator section
    expect(result).toContain('## Creator');
    expect(result).toContain('**Name:** John Doe');
    expect(result).toContain('**ID:** creator_1');
    expect(result).toContain('**Email:** john.doe@example.com');

    // Test workspace section
    expect(result).toContain('## Workspace');
    expect(result).toContain('**Name:** Development Team');
    expect(result).toContain('**ID:** workspace_1');
    expect(result).toContain('**Kind:** open');
    expect(result).toContain('**Description:** Main development workspace');

    // Test owners section
    expect(result).toContain('## Board Owners');
    expect(result).toContain('1. **Alice Smith** (ID: owner_1)');
    expect(result).toContain('2. **Bob Johnson** (ID: owner_2)');

    // Test team owners section
    expect(result).toContain('## Team Owners');
    expect(result).toContain('1. **Frontend Team** (ID: team_1)');

    // Test groups section
    expect(result).toContain('## Groups');
    expect(result).toContain('1. **To Do** (ID: group_1)');
    expect(result).toContain('2. **In Progress** (ID: group_2)');

    // Test top group section
    expect(result).toContain('## Top Group');
    expect(result).toContain('**ID:** top_group_1');

    // Test columns section
    expect(result).toContain('## Columns');
    expect(result).toContain('1. **Task Name** (text)');
    expect(result).toContain('   - **ID:** col_1');
    expect(result).toContain('   - **Description:** The name of the task');
    expect(result).toContain('   - **Settings:** {"width": 200}');

    expect(result).toContain('2. **Status** (status)');
    expect(result).toContain('   - **ID:** col_2');
    expect(result).toContain('   - **Settings:** {"labels": ["Not Started", "In Progress", "Done"]}');

    // Test tags section
    expect(result).toContain('## Tags');
    expect(result).toContain('1. **urgent** (ID: tag_1)');
    expect(result).toContain('2. **bug-fix** (ID: tag_2)');

    // Test permissions section
    expect(result).toContain('## Permissions');
    expect(result).toContain('write');
  });

  it('should handle minimal board data gracefully', () => {
    const minimalBoard = {
      id: '123',
      name: 'Minimal Board',
      description: undefined,
      state: State.Active,
      board_kind: BoardKind.Private,
      permissions: 'read',
      url: 'https://monday.com/boards/123',
      updated_at: undefined,
      item_terminology: undefined,
      items_count: undefined,
      items_limit: undefined,
      board_folder_id: undefined,
      creator: undefined,
      workspace: undefined,
      owners: [],
      team_owners: undefined,
      groups: [],
      top_group: undefined,
      columns: [],
      tags: undefined,
    } as any;

    const result = formatBoardInfo(minimalBoard);

    expect(result).toContain('# Board Information');
    expect(result).toContain('**Name:** Minimal Board');
    expect(result).toContain('**ID:** 123');
    expect(result).toContain('**Description:** No description');
    expect(result).toContain('**State:** active');
    expect(result).toContain('**Kind:** private');
    expect(result).toContain('**Item Terminology:** items');
    expect(result).toContain('**Items Count:** 0');
    expect(result).toContain('**Items Limit:** No limit');
    expect(result).toContain('**Board Folder ID:** None');

    // Should not contain optional sections
    expect(result).not.toContain('## Creator');
    expect(result).not.toContain('## Workspace');
    expect(result).not.toContain('## Board Owners');
    expect(result).not.toContain('## Team Owners');
    expect(result).not.toContain('## Groups');
    expect(result).not.toContain('## Top Group');
    expect(result).not.toContain('## Columns');
    expect(result).not.toContain('## Tags');

    // Should contain permissions
    expect(result).toContain('## Permissions');
    expect(result).toContain('read');
  });

  it('should maintain proper section order', () => {
    const board: BoardInfoData = {
      id: '123',
      name: 'Test Board',
      description: 'Test',
      state: State.Active,
      board_kind: BoardKind.Public,
      permissions: 'write',
      url: 'https://test.com',
      updated_at: '2024-01-01',
      item_terminology: 'items',
      items_count: 1,
      items_limit: 10,
      board_folder_id: 'folder',
      creator: { id: '1', name: 'Creator', email: 'test@test.com' },
      workspace: { id: '1', name: 'Workspace', kind: WorkspaceKind.Open, description: 'Test workspace' },
      owners: [{ id: '1', name: 'Owner' }],
      team_owners: [{ id: '1', name: 'Team', picture_url: 'pic.jpg' }],
      groups: [{ id: '1', title: 'Group' }],
      top_group: { id: '1' },
      columns: [{ id: '1', title: 'Column', description: 'Test', type: ColumnType.Text, settings_str: '{}' }],
      tags: [{ id: '1', name: 'tag' }],
    } as BoardInfoData;

    const result = formatBoardInfo(board);

    const sections = [
      '# Board Information',
      '## Creator',
      '## Workspace',
      '## Board Owners',
      '## Team Owners',
      '## Groups',
      '## Top Group',
      '## Columns',
      '## Tags',
      '## Permissions',
    ];

    let lastIndex = -1;
    sections.forEach((section) => {
      const currentIndex = result.indexOf(section);
      expect(currentIndex).toBeGreaterThan(lastIndex);
      lastIndex = currentIndex;
    });
  });
});
