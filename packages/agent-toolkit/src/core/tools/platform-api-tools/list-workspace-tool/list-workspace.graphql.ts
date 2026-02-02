import { gql } from 'graphql-request';

export const listWorkspaces = gql`
  query listWorkspaces($limit: Int!, $page: Int!, $membershipKind: WorkspaceMembershipKind!) {
    workspaces(limit: $limit, page: $page, membership_kind: $membershipKind) {
      id
      name
      description
    }
  }
`;
