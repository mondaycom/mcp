import { gql } from 'graphql-request';

export const getFolders = gql`
  query GetFolders($page: Int!, $limit: Int!, $workspace_ids: [ID]) {
    folders(page: $page, limit: $limit, workspace_ids: $workspace_ids) {
      id
      name
    }
  }
`;

export const searchItems = gql`
  query SearchItems($query: String!, $limit: Int, $workspaceIds: [ID!]) {
    search {
      items(query: $query, limit: $limit, workspace_ids: $workspaceIds) {
        results {
          id
          indexed_data {
            id
            name
            url
            board_id
            workspace_id
          }
        }
      }
    }
  }
`;

export const searchBoards = gql`
  query SearchBoards($query: String!, $limit: Int, $workspaceIds: [ID!]) {
    search {
      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {
        results {
          id
          indexed_data {
            id
            name
            url
            workspace_id
          }
        }
      }
    }
  }
`;

export const searchDocs = gql`
  query SearchDocs($query: String!, $limit: Int, $workspaceIds: [ID!]) {
    search {
      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {
        results {
          id
          indexed_data {
            id
            name
            workspace_id
          }
        }
      }
    }
  }
`;

export const searchWorkspaces = gql`
  query SearchWorkspaces($query: String!, $limit: Int) {
    search {
      workspaces(query: $query, limit: $limit) {
        results {
          id
          indexed_data {
            id
            name
            description
          }
        }
      }
    }
  }
`;

export const searchUpdates = gql`
  query SearchUpdates($query: String!, $limit: Int, $boardIds: [ID!], $creatorIds: [ID!]) {
    search {
      updates(query: $query, limit: $limit, board_ids: $boardIds, creator_ids: $creatorIds) {
        results {
          id
          indexed_data {
            id
            body
            creator_id
            item_id
            board_id
          }
        }
      }
    }
  }
`;

export const searchTimelineItems = gql`
  query SearchTimelineItems($query: String!, $limit: Int) {
    search {
      timeline_items(query: $query, limit: $limit) {
        results {
          id
          indexed_data {
            id
            title
            summary
            content
            item_id
            board_id
          }
        }
      }
    }
  }
`;
