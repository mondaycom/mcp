import { gql } from 'graphql-request';

export const getAssets = gql`
  query getAssets($ids: [ID!]!) {
    assets(ids: $ids) {
      id
      name
      file_extension
      file_size
      public_url
      url
      url_thumbnail
      created_at
      original_geometry
      uploaded_by {
        id
        name
      }
    }
  }
`;
