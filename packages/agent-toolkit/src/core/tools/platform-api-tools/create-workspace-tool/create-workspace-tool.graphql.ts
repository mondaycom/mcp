import { gql } from 'graphql-request';

export const createWorkspace = gql`
  mutation createWorkspace(
    $name: String!
    $workspaceKind: WorkspaceKind!
    $description: String
    $accountProductId: ID
  ) {
    create_workspace(
      name: $name
      kind: $workspaceKind
      description: $description
      account_product_id: $accountProductId
    ) {
      id
    }
  }
`;
