import { gql } from 'graphql-request';

export const updateAssetsOnItem = gql`
  mutation updateAssetsOnItem($boardId: ID!, $itemId: ID!, $columnId: String!, $files: [FileInput!]!) {
    update_assets_on_item(board_id: $boardId, item_id: $itemId, column_id: $columnId, files: $files) {
      id
      name
    }
  }
`;
