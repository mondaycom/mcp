import { gql } from 'graphql-request';

export const updateObjectSchemaMutation = gql`
  mutation UpdateObjectSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {
    update_object_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
