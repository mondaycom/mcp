import { organizeWorkspaceInfoHierarchy } from './helpers';
import { WorkspaceKind, State } from '../../../../monday-graphql/generated/graphql';

describe('WorkspaceInfoTool', () => {
  describe('organizeWorkspaceInfoHierarchy', () => {
    it('should organize workspace data with proper hierarchy', () => {
      const rawResponse = {
        workspaces: [
          {
            id: '45354',
            name: 'Builders',
            description: '',
            kind: WorkspaceKind.Open,
            created_at: '2019-12-15T09:16:04Z',
            state: State.Active,
            is_default_workspace: false,
            owners_subscribers: [
              {
                id: '8387',
                name: 'Greg Rashkevitch',
                email: 'greg@monday.com',
              },
            ],
          },
        ],
        boards: [
          {
            id: '9579738460',
            name: 'MCP Alpha',
            board_folder_id: '17523380',
          },
          {
            id: '403283836',
            name: 'Processes',
            board_folder_id: null,
          },
        ],
        docs: [
          {
            id: '695',
            name: 'Sunday KPIs / Builders Dashboard',
            doc_folder_id: null,
          },
          {
            id: '2243',
            name: 'Q3-2021 Pre-Kick Alignment Meeting',
            doc_folder_id: '6398520',
          },
        ],
        folders: [
          {
            id: '17523380',
            name: 'MCP Product',
          },
          {
            id: '6398520',
            name: 'Builders Skeleton',
          },
        ],
      };

      const result = organizeWorkspaceInfoHierarchy(rawResponse);

      expect(result).toEqual({
        workspace: {
          id: '45354',
          name: 'Builders',
          description: '',
          kind: 'open',
          created_at: '2019-12-15T09:16:04Z',
          state: 'active',
          is_default_workspace: false,
          owners_subscribers: [
            {
              id: '8387',
              name: 'Greg Rashkevitch',
              email: 'greg@monday.com',
            },
          ],
        },
        folders: [
          {
            id: '17523380',
            name: 'MCP Product',
            boards: [
              {
                id: '9579738460',
                name: 'MCP Alpha',
              },
            ],
            docs: [],
          },
          {
            id: '6398520',
            name: 'Builders Skeleton',
            boards: [],
            docs: [
              {
                id: '2243',
                name: 'Q3-2021 Pre-Kick Alignment Meeting',
              },
            ],
          },
        ],
        root_items: {
          boards: [
            {
              id: '403283836',
              name: 'Processes',
            },
          ],
          docs: [
            {
              id: '695',
              name: 'Sunday KPIs / Builders Dashboard',
            },
          ],
        },
      });
    });

    it('should handle empty folders and organize correctly', () => {
      const rawResponse = {
        workspaces: [
          {
            id: '138',
            name: 'Test Workspace',
            description: 'Test',
            kind: WorkspaceKind.Open,
            created_at: '2019-12-15T09:16:04Z',
            state: State.Active,
            is_default_workspace: false,
            owners_subscribers: [],
          },
        ],
        boards: [],
        docs: [],
        folders: [
          {
            id: '123',
            name: 'Empty Folder',
          },
        ],
      };

      const result = organizeWorkspaceInfoHierarchy(rawResponse);

      expect(result.folders).toEqual([
        {
          id: '123',
          name: 'Empty Folder',
          boards: [],
          docs: [],
        },
      ]);
      expect(result.root_items.boards).toEqual([]);
      expect(result.root_items.docs).toEqual([]);
    });
  });
});
