import { gql } from 'graphql-request';

export const searchV2Dev = gql`
  query SearchV2Dev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {
    search_v2(query: $query, limit: $limit, filters: $filters) {
      __typename
      ... on BoardSearchResult {
        entity_type
        data {
          id
          name
          url
        }
      }
      ... on DocSearchResult {
        entity_type
        data {
          id
          name
        }
      }
    }
  }
`;
