import { gql } from 'graphql-request';

export const getBoardActivity = gql`
  query GetBoardActivity(
    $boardId: ID!
    $itemIds: [ID!]
    $userIds: [ID!]
    $fromDate: ISO8601DateTime!
    $toDate: ISO8601DateTime!
    $limit: Int = 1000
    $page: Int = 1
    $includeData: Boolean!
  ) {
    boards(ids: [$boardId]) {
      name
      url
      activity_logs(item_ids: $itemIds, user_ids: $userIds, from: $fromDate, to: $toDate, limit: $limit, page: $page) {
        user_id
        entity
        event
        data @include(if: $includeData)
        created_at
      }
    }
  }
`;
