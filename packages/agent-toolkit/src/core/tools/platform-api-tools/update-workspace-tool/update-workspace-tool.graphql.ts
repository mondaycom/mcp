import { gql } from 'graphql-request';

export const updateWorkspace = gql`
  mutation updateWorkspace($id: ID!, $attributes: UpdateWorkspaceAttributesInput!) {
    update_workspace(id: $id, attributes: $attributes) {
      id
    }
  }
`;
