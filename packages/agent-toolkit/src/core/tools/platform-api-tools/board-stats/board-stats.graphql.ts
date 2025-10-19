import { gql } from 'graphql-request';

export const boardStats = gql`
  query aggregateBoardStats($query: AggregateQueryInput!) {
    aggregate(query: $query) {
      results {
        entries {
          alias
          value {
            ... on AggregateBasicAggregationResult {
              result
            }
            ... on AggregateGroupByResult {
              value_string
              value_int
              value_float
              value_boolean
            }
          }
        }
      }
    }
  }
`;
