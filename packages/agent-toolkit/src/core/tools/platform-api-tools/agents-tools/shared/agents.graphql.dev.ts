import { gql } from 'graphql-request';

const agentFieldsFragment = gql`
  fragment AgentFields on Agent {
    id
    kind
    state
    profile {
      name
      role
      role_description
      avatar_url
      background_color
    }
    goal
    plan
    user_prompt
    version_id
    created_at
    updated_at
  }
`;

export const getAgentQuery = gql`
  ${agentFieldsFragment}

  query getAgent($id: ID!) {
    agent(id: $id) {
      ...AgentFields
    }
  }
`;

export const listAgentsQuery = gql`
  ${agentFieldsFragment}

  query listAgents {
    agents {
      ...AgentFields
    }
  }
`;

export const createAgentMutation = gql`
  ${agentFieldsFragment}

  mutation createAgent($input: CreateAgentInput!) {
    create_agent(input: $input) {
      ...AgentFields
    }
  }
`;

export const createBlankAgentMutation = gql`
  ${agentFieldsFragment}

  mutation createBlankAgent($input: CreateBlankAgentInput) {
    create_blank_agent(input: $input) {
      ...AgentFields
    }
  }
`;

export const deleteAgentMutation = gql`
  ${agentFieldsFragment}

  mutation deleteAgent($id: ID!) {
    delete_agent(id: $id) {
      ...AgentFields
    }
  }
`;
