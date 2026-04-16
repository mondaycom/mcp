import { gql } from 'graphql-request';

export const createSchemaMutationDev = gql`
  mutation CreateSchema($name: String!, $parentId: ID, $description: String) {
    create_schema(name: $name, parent_id: $parentId, description: $description) {
      id
      name
      description
      parent_id
    }
  }
`;
