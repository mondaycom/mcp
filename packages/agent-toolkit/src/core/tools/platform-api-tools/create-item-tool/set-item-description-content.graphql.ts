import { gql } from 'graphql-request';

export const setItemDescriptionContent = gql`
  mutation setItemDescriptionContent($itemId: ID!, $markdown: String!) {
    set_item_description_content(item_id: $itemId, markdown: $markdown) {
      success
      block_ids
      error
    }
  }
`;
