import { gql } from 'graphql-request';

export const publishWorkflowMutation = gql`
  mutation publishWorkflow($workflow_object_id: ID!, $workflow_draft_id: ID!, $should_activate: Boolean) {
    publish_workflow(
      workflow_object_id: $workflow_object_id
      workflow_draft_id: $workflow_draft_id
      should_activate: $should_activate
    ) {
      workflow_object_id
      workflow_live_id
    }
  }
`;
