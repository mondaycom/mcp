import { gql } from 'graphql-request';

export const createSubitem = gql`
  mutation createSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON) {
    create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) {
      id
      name
      parent_item {
        id
      }
    }
  }
`;
