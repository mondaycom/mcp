import { gql } from 'graphql-request';

export const searchItemsDev = gql`
  query SearchItemsDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {
    search(query: $query, limit: $limit, filters: $filters) {
      __typename
      ... on ItemSearchResult {
        data {
          id
        }
      }
    }
  }
`;
