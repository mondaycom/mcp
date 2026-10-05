import { gql } from 'graphql-request';

export const boardInsights = gql`
  query aggregateBoardInsights($query: AggregateQueryInput!, $boardId: ID!) {
    boards(ids: [$boardId], limit: 1) {
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

export const boardInsightsColumnTypes = gql`
  query boardInsightsColumnTypes($boardId: ID!, $columnIds: [String!]) {
    boards(ids: [$boardId], limit: 1) {
      columns(ids: $columnIds) {
        id
        type
      }
    }
  }
`;
