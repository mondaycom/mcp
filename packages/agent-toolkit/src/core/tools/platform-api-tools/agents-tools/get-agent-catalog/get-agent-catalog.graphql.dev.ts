import { gql } from 'graphql-request';

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
