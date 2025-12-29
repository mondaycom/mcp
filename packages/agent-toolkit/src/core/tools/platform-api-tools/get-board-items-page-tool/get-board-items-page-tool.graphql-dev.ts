import { gql } from 'graphql-request';

export const searchItemsDev = gql`
  query SearchItemsDev($searchTerm: String!, $board_ids: [ID!]) {
    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {
      results {
        data {
          id
        }
      }
    }
  }
`;

export const searchDev = gql`
  query SearchDev {
    search(query: "test", size: 100) {
      ... on CrossEntityItemResult {
        id
      }
    }
  }
`;