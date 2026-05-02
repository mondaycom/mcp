import { gql } from 'graphql-request';

export const deleteObjectSchemaMutation = gql`
  mutation DeleteObjectSchema($id: ID, $name: String) {
    delete_object_schema(id: $id, name: $name) {
      id
      name
    }
  }
`;
