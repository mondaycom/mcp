import { gql } from 'graphql-request';

export const createObjectSchemaMutation = gql`
  mutation CreateObjectSchema($name: String!, $parentId: ID, $description: String) {
    create_object_schema(name: $name, parent_id: $parentId, description: $description) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
