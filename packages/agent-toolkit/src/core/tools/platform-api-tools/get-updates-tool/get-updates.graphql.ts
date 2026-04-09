import { gql } from 'graphql-request';

export const getItemUpdates = gql`
  query GetItemUpdates($itemId: ID!, $limit: Int, $page: Int, $includeReplies: Boolean!, $includeAssets: Boolean!) {
    items(ids: [$itemId]) {
      id
      url
      updates(limit: $limit, page: $page) {
        id
        text_body
        created_at
        updated_at
        item_id
        creator {
          id
          name
        }
        replies @include(if: $includeReplies) {
          id
          text_body
          created_at
          updated_at
          creator {
            id
            name
          }
        }
        assets @include(if: $includeAssets) {
          id
          name
          url
          file_extension
          file_size
          created_at
        }
      }
    }
  }
`;

export const getBoardUpdates = gql`
  query GetBoardUpdates(
    $boardId: ID!
    $limit: Int
    $page: Int
    $includeReplies: Boolean!
    $includeAssets: Boolean!
    $fromDate: ISO8601DateTime
    $toDate: ISO8601DateTime
    $boardUpdatesOnly: Boolean
  ) {
    boards(ids: [$boardId]) {
      id
      url
      updates(
        limit: $limit
        page: $page
        board_updates_only: $boardUpdatesOnly
        from_date: $fromDate
        to_date: $toDate
      ) {
        id
        text_body
        created_at
        updated_at
        item_id
        creator {
          id
          name
        }
        replies @include(if: $includeReplies) {
          id
          text_body
          created_at
          updated_at
          creator {
            id
            name
          }
        }
        assets @include(if: $includeAssets) {
          id
          name
          url
          file_extension
          file_size
          created_at
        }
      }
    }
  }
`;
