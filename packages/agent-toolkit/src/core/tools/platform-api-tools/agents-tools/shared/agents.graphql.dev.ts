import { gql } from 'graphql-request';

// ─── Shared fragment ──────────────────────────────────────────────────────────

export const agentFieldsFragment = gql`
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

// ─── Agent CRUD ───────────────────────────────────────────────────────────────

export const getAgentsQuery = gql`
  ${agentFieldsFragment}

  query getAgents($ids: [ID!], $limit: Int) {
    agents(ids: $ids, limit: $limit) {
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

export const updateAgentMutation = gql`
  ${agentFieldsFragment}

  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {
    update_agent(id: $id, input: $input) {
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

// ─── State mutations ──────────────────────────────────────────────────────────

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

// ─── Capabilities — triggers ──────────────────────────────────────────────────

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

// ─── Capabilities — skills ────────────────────────────────────────────────────

export const addSkillToAgentMutation = gql`
  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {
    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {
      success
    }
  }
`;

export const removeSkillFromAgentMutation = gql`
  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {
    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {
      success
    }
  }
`;

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const getAgentTriggersCatalogQuery = gql`
  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {
    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {
      block_reference_id
      name
      description
      field_schemas {
        field_key
        value_schema
      }
      required_fields {
        field_key
        depends_on
        optional
      }
    }
  }
`;

export const getAgentSkillsCatalogQuery = gql`
  query getAgentSkillsCatalog {
    agent_skills_catalog {
      id
      name
      description
    }
  }
`;

export const createAgentSkillMutation = gql`
  mutation createAgentSkill($name: String!, $content: String!, $description: String) {
    create_agent_skill(name: $name, content: $content, description: $description) {
      id
      name
      description
    }
  }
`;
