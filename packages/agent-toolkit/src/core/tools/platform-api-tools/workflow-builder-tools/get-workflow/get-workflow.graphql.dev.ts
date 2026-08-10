import { gql } from 'graphql-request';

export const getWorkflowsQuery = gql`
  query getWorkflows($ids: [ID!]!) {
    workflows(ids: $ids) {
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
  }
`;
