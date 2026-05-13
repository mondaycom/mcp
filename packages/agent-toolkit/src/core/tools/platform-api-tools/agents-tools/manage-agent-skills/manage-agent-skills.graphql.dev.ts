import { gql } from 'graphql-request';

export const createAgentSkillMutation = gql`
  mutation createAgentSkill($name: String!, $content: String!, $description: String) {
    create_agent_skill(name: $name, content: $content, description: $description) {
      id
      name
      description
    }
  }
`;

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
