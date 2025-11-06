import { gql } from 'graphql-request';

export const duplicateItem = gql`
  mutation duplicateItem($boardId: ID!, $itemId: ID!, $withUpdates: Boolean) {
    duplicate_item(board_id: $boardId, item_id: $itemId, with_updates: $withUpdates) {
      id
      name
    }
  }
`;
