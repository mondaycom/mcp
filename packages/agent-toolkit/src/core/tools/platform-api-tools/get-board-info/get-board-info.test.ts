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
          settings: { width: 200 },
        },
        {
          id: 'col_2',
          title: 'Status',
          description: undefined,
          type: ColumnType.Status,
          settings: {labels: ["Not Started", "In Progress", "Done"]},
        },
      ],
      tags: [
        { id: 'tag_1', name: 'urgent' },
        { id: 'tag_2', name: 'bug-fix' },
      ],
    } as BoardInfoData;

    const result = formatBoardInfo(mockBoard, null);

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
    expect(result).toContain('   - **Settings:** {"width":200}');

    expect(result).not.toContain('## Sub Items Columns');

    expect(result).toContain('2. **Status** (status)');
    expect(result).toContain('   - **ID:** col_2');
    expect(result).toContain('   - **Settings:** {"labels":["Not Started","In Progress","Done"]}');

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

    const result = formatBoardInfo(minimalBoard, null);

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
      columns: [{ id: '1', title: 'Column', description: 'Test', type: ColumnType.Text, settings: {} }],
      tags: [{ id: '1', name: 'tag' }],
    } as BoardInfoData;

    const result = formatBoardInfo(board, null);

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

  it('should include sub items columns when subItemBoard is provided', () => {
    const mockBoard = {
      id: '123456789',
      name: 'Main Board',
      description: 'Main board with items',
      state: State.Active,
      board_kind: BoardKind.Public,
      permissions: 'write',
      url: 'https://monday.com/boards/123456789',
      updated_at: '2024-01-15T10:30:00Z',
      item_terminology: 'tasks',
      items_count: 25,
      items_limit: 100,
      board_folder_id: 'folder_123',
      creator: undefined,
      workspace: undefined,
      owners: [],
      team_owners: undefined,
      groups: [],
      top_group: undefined,
      columns: [
        {
          id: 'main_col_1',
          title: 'Main Task Name',
          description: 'The name of the main task',
          type: ColumnType.Text,
          settings: { width: 200 },
        },
        {
          id: 'main_col_2',
          title: 'Main Status',
          description: undefined,
          type: ColumnType.Status,
          settings: { labels: ['Not Started', 'In Progress', 'Done'] },
        },
      ],
      tags: undefined,
    } as any;

    const mockSubItemBoard = {
      id: '987654321',
      name: 'Sub Items Board',
      columns: [
        {
          id: 'sub_col_1',
          title: 'Sub Task Name',
          description: 'The name of the sub task',
          type: ColumnType.Text,
          settings: { width: 150 },
        },
        {
          id: 'sub_col_2',
          title: 'Sub Priority',
          description: undefined,
          type: ColumnType.Status,
          settings: { labels: ['Low', 'Medium', 'High'] },
        },
      ],
    } as any;

    const result = formatBoardInfo(mockBoard, mockSubItemBoard);

    // Test that main columns section exists
    expect(result).toContain('## Columns');
    expect(result).toContain('1. **Main Task Name** (text)');
    expect(result).toContain('   - **ID:** main_col_1');
    expect(result).toContain('   - **Description:** The name of the main task');
    expect(result).toContain('   - **Settings:** {"width":200}');
    expect(result).toContain('2. **Main Status** (status)');
    expect(result).toContain('   - **ID:** main_col_2');
    expect(result).toContain('   - **Settings:** {"labels":["Not Started","In Progress","Done"]}');

    // Test that sub items columns section exists
    expect(result).toContain('## Sub Items Columns');
    expect(result).toContain('1. **Sub Task Name** (text)');
    expect(result).toContain('   - **ID:** sub_col_1');
    expect(result).toContain('   - **Description:** The name of the sub task');
    expect(result).toContain('   - **Settings:** {"width":150}');
    expect(result).toContain('2. **Sub Priority** (status)');
    expect(result).toContain('   - **ID:** sub_col_2');
    expect(result).toContain('   - **Settings:** {"labels":["Low","Medium","High"]}');

    // Test that both sections appear in order (Columns before Sub Items Columns)
    const columnsIndex = result.indexOf('## Columns');
    const subItemsColumnsIndex = result.indexOf('## Sub Items Columns');
    expect(columnsIndex).toBeLessThan(subItemsColumnsIndex);
  });
});
