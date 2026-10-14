import { gql } from 'graphql-request';

export const searchItemsDev = gql`
  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {
    search {
      items(query: $query, limit: $limit, board_ids: $boardIds) {
        results {
          id
        }
      }
    }
  }
`;
