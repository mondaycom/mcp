import { gql } from 'graphql-request';

export const getFileColumnValue = gql`
  query GetFileColumnValue($itemId: ID!, $columnId: String!) {
    items(ids: [$itemId]) {
      column_values(ids: [$columnId]) {
        ... on FileValue {
          files {
            __typename
            ... on FileAssetValue {
              asset_id
              name
            }
            ... on FileDocValue {
              object_id
              doc {
                name
              }
            }
            ... on FileLinkValue {
              name
              kind
              url
            }
          }
        }
      }
    }
  }
`;
