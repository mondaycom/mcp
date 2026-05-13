import { gql } from 'graphql-request';

export const activateAgentMutation = gql`
  mutation activateAgent($id: ID!) {
    activate_agent(id: $id) {
      success
    }
  }
`;

export const deactivateAgentMutation = gql`
  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {
    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {
      success
    }
  }
`;

export const runAgentMutation = gql`
  mutation runAgent($id: ID!) {
    run_agent(id: $id) {
      trigger_uuid
    }
  }
`;
