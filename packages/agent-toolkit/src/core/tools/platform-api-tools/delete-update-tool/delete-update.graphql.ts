import { gql } from 'graphql-request';

export const deleteUpdate = gql`
  mutation DeleteUpdate($id: ID!) {
    delete_update(id: $id) {
      id
    }
  }
`;
