import { gql } from 'graphql-request';

export const getItemsBoardIds = gql`
  query GetItemsBoardIds($itemIds: [ID!]!, $limit: Int) {
    items(ids: $itemIds, limit: $limit) {
      id
      board {
        id
      }
    }
  }
`;
