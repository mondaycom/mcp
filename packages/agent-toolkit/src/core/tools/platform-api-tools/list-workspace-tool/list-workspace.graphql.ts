import { gql } from 'graphql-request';

export const listWorkspaces = gql`
  query listWorkspaces($limit: Int!) {
    workspaces(limit: $limit) {
      id
      name
      description
    }
  }
`;
