import { gql } from 'graphql-request';

export const getItemAssets = gql`
  query GetItemAssets($itemId: [ID!]!, $columnId: [String!]!) {
    items(ids: $itemId) {
      assets(column_ids: $columnId) {
        public_url
        name
        file_extension
      }
    }
  }
`;
