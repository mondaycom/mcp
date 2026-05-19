import { gql } from 'graphql-request';

export const deleteLiveWorkflowMutation = gql`
  mutation deleteLiveWorkflow($id: ID!) {
    delete_live_workflow(id: $id) {
      is_success
    }
  }
`;
