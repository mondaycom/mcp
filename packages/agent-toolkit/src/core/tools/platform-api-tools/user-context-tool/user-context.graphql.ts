import { gql } from 'graphql-request';

export const getUserContextQuery = gql`
  query getUserContext {
    me {
      id
      name
      title
    }
    favorites {
      object {
        id
        type
      }
    }
  }
`;

export const getFavoriteDetailsQuery = gql`
  query getFavoriteDetails(
    $boardIds: [ID!]
    $folderIds: [ID!]
    $workspaceIds: [ID!]
    $dashboardIds: [ID!]
  ) {
    boards(ids: $boardIds) {
      id
      name
    }
    folders(ids: $folderIds) {
      id
      name
    }
    workspaces(ids: $workspaceIds) {
      id
      name
    }
    dashboards: boards(ids: $dashboardIds) {
      id
      name
    }
  }
`;
