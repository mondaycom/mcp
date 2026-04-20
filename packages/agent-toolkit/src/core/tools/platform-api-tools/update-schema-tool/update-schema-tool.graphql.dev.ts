import { gql } from 'graphql-request';

export const updateSchemaMutationDev = gql`
  mutation UpdateSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {
    update_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
