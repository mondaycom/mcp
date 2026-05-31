import { gql } from 'graphql-request';

export const getAgentKnowledgeQuery = gql`
  query getAgentKnowledge($id: ID!) {
    agent_knowledge(id: $id) {
      resources {
        resource_id
        scope_type
        permission_type
      }
      files {
        id
        file_name
        file_type
      }
    }
  }
`;

export const addAgentResourceAccessMutation = gql`
  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {
    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {
      success
    }
  }
`;

export const removeAgentResourceAccessMutation = gql`
  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {
    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {
      success
    }
  }
`;

export const updateAgentResourceAccessMutation = gql`
  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {
    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {
      success
    }
  }
`;
