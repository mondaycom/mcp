import { gql } from 'graphql-request';

export const getBoardAllActivity = gql`
  query GetBoardAllActivity(
    $boardId: ID!
    $fromDate: ISO8601DateTime!
    $toDate: ISO8601DateTime!
    $limit: Int = 1000
    $page: Int = 1
    $includeData: Boolean!
  ) {
    boards(ids: [$boardId]) {
      activity_logs(from: $fromDate, to: $toDate, limit: $limit, page: $page) {
        user_id
        entity
        event
        data @include(if: $includeData)
        created_at
      }
    }
  }
`;
