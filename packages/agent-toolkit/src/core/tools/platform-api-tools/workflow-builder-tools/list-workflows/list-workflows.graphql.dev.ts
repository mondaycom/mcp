import { gql } from 'graphql-request';

export const listWorkflowsQuery = gql`
  query listWorkflows($pagination: WorkflowAutomationsPaginationInput) {
    live_workflows_page(pagination: $pagination) {
      data {
        id
        title
        description
        active
        created_at
        updated_at
        steps {
          node_id
          block_reference_id
          title
        }
      }
      page_info {
        has_next_page
        end_cursor
      }
    }
  }
`;
