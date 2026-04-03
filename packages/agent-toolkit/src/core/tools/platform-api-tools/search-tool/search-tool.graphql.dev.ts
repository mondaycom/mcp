import { gql } from 'graphql-request';

export const searchDev = gql`
  query SearchDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {
    cross_entity_search(query: $query, limit: $limit, filters: $filters) {
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
