import { gql } from 'graphql-request';
import { agentFieldsFragment } from '../shared/agents.graphql.dev';

export const updateAgentMutation = gql`
  ${agentFieldsFragment}

  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {
    update_agent(id: $id, input: $input) {
      ...AgentFields
    }
  }
`;
