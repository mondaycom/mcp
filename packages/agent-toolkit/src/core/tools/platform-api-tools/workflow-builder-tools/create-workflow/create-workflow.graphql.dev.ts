import { gql } from 'graphql-request';

export const createWorkflowMutation = gql`
  mutation createWorkflow(
    $workspace_id: ID!
    $title: String
    $privacy_kind: WorkflowBuilderPrivacyKind
    $description: String
    $folder_id: ID
    $owner_ids: [ID!]
  ) {
    create_workflow(
      workspace_id: $workspace_id
      title: $title
      privacy_kind: $privacy_kind
      description: $description
      folder_id: $folder_id
      owner_ids: $owner_ids
    ) {
      workflow_object_id
      workflow_draft_id
    }
  }
`;
