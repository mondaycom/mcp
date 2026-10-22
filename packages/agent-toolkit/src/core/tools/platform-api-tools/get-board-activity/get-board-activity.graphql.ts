import { gql } from 'graphql-request';

export const getBoardActivity = gql`
  query GetBoardActivity(
    $boardId: ID!
    $itemIds: [ID!]
    $userIds: [ID!]
    $fromDate: String!
    $toDate: String!
    $limit: Int = 1000
    $includeData: Boolean!
  ) {
    boards(ids: [$boardId], limit: 1) {
      name
      url
      activity_logs(item_ids: $itemIds, user_ids: $userIds, from: $fromDate, to: $toDate, limit: $limit) {
        logs {
          user_id
          entity
          event
          data @include(if: $includeData)
          created_at
        }
        cursor
      }
    }
  }
`;
