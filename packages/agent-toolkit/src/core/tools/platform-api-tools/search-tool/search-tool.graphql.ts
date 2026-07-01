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
