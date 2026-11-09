import { gql } from 'graphql-request';

// Legacy activity_logs shape, invalid against the committed 2027-01 schema, so it is typed by hand and pinned to 2026-10.
export const GET_BOARD_ACTIVITY_API_VERSION = '2026-10';

export type GetBoardActivityQueryVariables = {
  boardId: string;
  itemIds?: string[] | string | null;
  userIds?: string[] | string | null;
  fromDate: string;
  toDate: string;
  limit?: number | null;
  page?: number | null;
  includeData: boolean;
};

export type GetBoardActivityQuery = {
  boards?: Array<{
    name: string;
    url: string;
    activity_logs?: Array<{
      user_id: string;
      entity: string;
      event: string;
      data?: string;
      created_at: string;
    } | null> | null;
  } | null> | null;
};

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
    boards(ids: [$boardId], limit: 1) {
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
