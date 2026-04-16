import { gql } from 'graphql-request';

export const deleteSchemaMutationDev = gql`
  mutation DeleteSchema($id: ID, $name: String) {
    delete_schema(id: $id, name: $name) {
      id
      name
    }
  }
`;
