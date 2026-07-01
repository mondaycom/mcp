import { gql } from 'graphql-request';

export const createSubitem = gql`
  mutation createSubitem(
    $parentItemId: ID!
    $itemName: String!
    $columnValues: JSON
    $createLabelsIfMissing: Boolean
  ) {
    create_subitem(
      parent_item_id: $parentItemId
      item_name: $itemName
      column_values: $columnValues
      create_labels_if_missing: $createLabelsIfMissing
    ) {
      id
      name
      url
      parent_item {
        id
      }
    }
  }
`;
