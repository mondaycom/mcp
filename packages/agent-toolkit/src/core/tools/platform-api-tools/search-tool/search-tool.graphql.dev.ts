import { gql } from 'graphql-request';

export const searchBoardsDev = gql`
  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {
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

export const searchDocsDev = gql`
  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {
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
