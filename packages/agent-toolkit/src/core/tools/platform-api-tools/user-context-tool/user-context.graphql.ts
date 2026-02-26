import { gql } from 'graphql-request';

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
