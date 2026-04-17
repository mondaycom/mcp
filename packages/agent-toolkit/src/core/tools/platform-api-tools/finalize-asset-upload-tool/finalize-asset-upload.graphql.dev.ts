import { gql } from 'graphql-request';

export const completeUploadMutationDev = gql`
  mutation CompleteUpload($input: CompleteUploadInput!) {
    complete_upload(input: $input) {
      id
      filename
      content_type
      file_size
      url
      created_at
      is_image
      url_thumb
    }
  }
`;
