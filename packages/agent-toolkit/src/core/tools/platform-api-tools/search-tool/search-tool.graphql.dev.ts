import { gql } from 'graphql-request';

export const searchDev = gql`
  query SearchDev($query: String!, $size: Int!, $entityTypes: [SearchableEntity!], $workspaceIds: [ID!]) {
    search(query: $query, size: $size, entity_types: $entityTypes, workspace_ids: $workspaceIds) {
      __typename
      ... on CrossEntityBoardResult {
        entity_type
        data {
          id
          name
          url
        }
      }
      ... on CrossEntityDocResult {
        entity_type
        data {
          id
          name
        }
      }
    }
  }
`;
