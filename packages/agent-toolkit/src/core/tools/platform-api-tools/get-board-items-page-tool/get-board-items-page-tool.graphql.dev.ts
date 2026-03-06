import { gql } from 'graphql-request';

export const searchItemsV2Dev = gql`
  query SearchItemsV2Dev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {
    search_v2(query: $query, limit: $limit, filters: $filters) {
      __typename
      ... on ItemSearchResult {
        data {
          id
        }
      }
    }
  }
`;
