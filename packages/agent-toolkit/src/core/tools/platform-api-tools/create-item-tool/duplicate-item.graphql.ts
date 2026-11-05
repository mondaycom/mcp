import { gql } from 'graphql-request';

// item_name and group_id were introduced in 2027-04. Drop the override once that is the toolkit default.
export const DUPLICATE_ITEM_API_VERSION = '2027-04';

export const duplicateItem = gql`
  mutation duplicateItem($boardId: ID!, $itemId: ID!, $itemName: String, $groupId: ID, $withUpdates: Boolean) {
    duplicate_item(
      board_id: $boardId
      item_id: $itemId
      item_name: $itemName
      group_id: $groupId
      with_updates: $withUpdates
    ) {
      id
      name
      url
    }
  }
`;
