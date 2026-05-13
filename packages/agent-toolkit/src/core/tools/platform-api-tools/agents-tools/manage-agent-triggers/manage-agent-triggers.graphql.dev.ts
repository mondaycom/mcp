import { gql } from 'graphql-request';

export const getAgentActiveTriggersQuery = gql`
  query getAgentActiveTriggers($agent_id: ID!) {
    agent_active_triggers(agent_id: $agent_id) {
      node_id
      block_reference_id
      name
      description
      field_summary
    }
  }
`;

export const addTriggerToAgentMutation = gql`
  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {
    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {
      success
    }
  }
`;

export const removeTriggerFromAgentMutation = gql`
  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {
    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {
      success
    }
  }
`;
