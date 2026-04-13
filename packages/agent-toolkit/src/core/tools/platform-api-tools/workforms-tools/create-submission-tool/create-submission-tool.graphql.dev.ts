import { gql } from 'graphql-request';

export const createSubmissionMutationDev = gql`
  mutation CreateFormSubmission(
    $form_token: String!
    $answers: [FormAnswerInput!]!
    $form_timezone_offset: Int!
    $password: String
    $group_id: ID
    $tags: [TagInput!]
  ) {
    create_form_submission(
      form_token: $form_token
      answers: $answers
      form_timezone_offset: $form_timezone_offset
      password: $password
      group_id: $group_id
      tags: $tags
    ) {
      id
    }
  }
`;
