import { gql } from 'graphql-request';

export const getSprintsByIds = gql`
  query getSprintsByIds($ids: [ID!]) {
    items(ids: $ids) {
      id
      name
      board {
        id
      }
      column_values {
        id
        type
        __typename
        ... on TextValue {
          value
        }
        ... on DateValue {
          date
        }
        ... on TimelineValue {
          from
          to
        }
        ... on CheckboxValue {
          checked
        }
        ... on DocValue {
          file {
            doc {
              object_id
            }
          }
        }
      }
    }
  }
`;
