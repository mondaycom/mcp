import { gql } from 'graphql-request';

export const createAccountEntityMutationDev = gql`
  mutation CreateAccountEntity($name: String!, $parentId: ID, $description: String) {
    create_account_entity(name: $name, parent_id: $parentId, description: $description) {
      id
      name
      description
      parent_id
    }
  }
`;
