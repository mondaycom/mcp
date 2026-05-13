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
