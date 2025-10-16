import { gql } from 'graphql-request';

export const getSprintsBoardItemsWithColumns = gql`
  query GetSprintsBoardItemsWithColumns($boardId: ID!, $limit: Int) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit) {
        items {
          id
          name
          column_values {
            __typename
            id
            type
            ... on TextValue {
              value
            }
            ... on DocValue {
              file {
                doc {
                  object_id
                }
              }
            }
            ... on TimelineValue {
              from
              to
            }
            ... on CheckboxValue {
              checked
            }
            ... on DateValue {
              date
            }
          }
        }
      }
    }
  }
`;
