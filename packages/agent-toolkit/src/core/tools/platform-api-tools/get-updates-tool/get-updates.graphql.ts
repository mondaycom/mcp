import { gql } from 'graphql-request';

export const getItemUpdates = gql`
  query GetItemUpdates($itemId: ID!, $limit: Int, $page: Int) {
    items(ids: [$itemId]) {
      id
      updates(limit: $limit, page: $page) {
        id
        body
        text_body
        created_at
        updated_at
        item_id
        creator {
          id
          name
        }
        replies {
          id
          body
          text_body
          created_at
          updated_at
          creator {
            id
            name
          }
        }
        assets {
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
  query GetBoardUpdates($boardId: ID!, $limit: Int, $page: Int) {
    boards(ids: [$boardId]) {
      id
      updates(limit: $limit, page: $page, board_updates_only: true) {
        id
        body
        text_body
        created_at
        updated_at
        item_id
        creator {
          id
          name
        }
        replies {
          id
          body
          text_body
          created_at
          updated_at
          creator {
            id
            name
          }
        }
        assets {
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
