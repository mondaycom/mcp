import { gql } from 'graphql-request';

export const boardInsights = gql`
  query aggregateBoardInsights($query: AggregateQueryInput!, $boardId: ID!) {
    boards(ids: [$boardId]) {
      name
      url
    }
    aggregate(query: $query) {
      results {
        entries {
          alias
          value {
            ... on AggregateBasicAggregationResult {
              result
            }
            ... on AggregateGroupByResult {
              value
            }
          }
        }
      }
    }
  }
`;
