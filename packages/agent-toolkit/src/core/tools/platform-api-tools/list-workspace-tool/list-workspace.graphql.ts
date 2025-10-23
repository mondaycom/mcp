import { gql } from 'graphql-request';

export const listWorkspaces = gql`
  query listWorkspaces($limit: Int!, $page: Int!) {
    workspaces(limit: $limit, page: $page) {
      id
      name
      description
    }
  }
`;
