import { gql } from 'graphql-request';

export const createUpdate = gql`
  mutation createUpdate($itemId: ID!, $body: String!, $mentionsList: [UpdateMention]) {
    create_update(body: $body, item_id: $itemId, mentions_list: $mentionsList) {
      id
    }
  }
`;
