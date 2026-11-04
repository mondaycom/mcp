import { gql } from 'graphql-request';

export const getBatchCreateColumns = gql`
  query getBatchCreateColumns($boardId: ID!, $columnIds: [String]) {
    boards(ids: [$boardId]) {
      columns(ids: $columnIds) {
        id
        type
        settings
      }
    }
  }
`;
