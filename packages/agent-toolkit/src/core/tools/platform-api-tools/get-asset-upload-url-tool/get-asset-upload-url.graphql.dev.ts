import { gql } from 'graphql-request';

export const createUploadMutationDev = gql`
  mutation CreateUpload($input: CreateUploadInput!) {
    create_upload(input: $input) {
      upload_id
      parts {
        part_number
        url
        size_range_start
        size_range_end
      }
      part_size
      expires_at
    }
  }
`;
