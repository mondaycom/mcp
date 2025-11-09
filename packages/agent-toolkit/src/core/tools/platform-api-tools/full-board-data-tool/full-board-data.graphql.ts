import { gql } from 'graphql-request';

export const getBoardDataQuery = gql`
  query getBoardData($boardId: ID!, $itemsLimit: Int!) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $itemsLimit) {
        items {
          id
          name
          column_values {
            id
            text
            type
            value
            ... on PeopleValue {
              persons_and_teams {
                id
                kind
              }
            }
          }
          updates {
            id
            creator_id
            text_body
            created_at
          }
        }
      }
      columns {
        id
        title
        type
        settings
      }
    }
  }
`;

export const getUsersByIdsQuery = gql`
  query getUsersByIds($userIds: [ID!]!) {
    users(ids: $userIds) {
      id
      name
      photo_tiny
    }
  }
`;
