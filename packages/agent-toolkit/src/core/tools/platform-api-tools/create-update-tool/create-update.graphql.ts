import { gql } from 'graphql-request';

export const createUpdate = gql`
  mutation createUpdate($itemId: ID!, $body: String!, $mentionsList: [UpdateMention], $parentId: ID) {
    create_update(body: $body, item_id: $itemId, mentions_list: $mentionsList, parent_id: $parentId) {
      id
      item_id
      item {
        name
        url
      }
    }
  }
`;

export const getItemUpdateReplyIds = gql`
  query getItemUpdateReplyIds($itemId: ID!) {
    items(ids: [$itemId], limit: 1) {
      updates(limit: 100) {
        id
        replies {
          id
        }
      }
    }
  }
`;
