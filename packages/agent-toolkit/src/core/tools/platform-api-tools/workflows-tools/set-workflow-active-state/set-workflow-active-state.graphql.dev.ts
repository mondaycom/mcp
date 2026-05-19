import { gql } from 'graphql-request';

export const activateLiveWorkflowMutation = gql`
  mutation activateLiveWorkflow($id: ID!) {
    activate_live_workflow(id: $id) {
      is_success
    }
  }
`;

export const deactivateLiveWorkflowMutation = gql`
  mutation deactivateLiveWorkflow($id: ID!) {
    deactivate_live_workflow(id: $id) {
      is_success
    }
  }
`;
