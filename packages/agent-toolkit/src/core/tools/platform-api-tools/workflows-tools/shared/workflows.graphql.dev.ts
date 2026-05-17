import { gql } from 'graphql-request';

const workflowFieldsFragment = gql`
  fragment WorkflowFields on Workflow {
    id
    user_id
    is_active
    automation_id
    title
    description
    importance
    notice_message
    template_reference_id
    created_at
    updated_at
    workflow_host_data {
      type
      id
    }
    workflow_blocks {
      workflowNodeId
      blockReferenceId
      title
      kind
    }
    workflow_variables
  }
`;

export const getLiveWorkflowsQuery = gql`
  ${workflowFieldsFragment}

  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {
    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {
      ...WorkflowFields
    }
  }
`;

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

export const deleteLiveWorkflowMutation = gql`
  mutation deleteLiveWorkflow($id: ID!) {
    delete_live_workflow(id: $id) {
      is_success
    }
  }
`;
