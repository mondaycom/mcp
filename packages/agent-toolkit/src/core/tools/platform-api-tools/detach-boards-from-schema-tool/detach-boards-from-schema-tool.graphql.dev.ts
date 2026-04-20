import { gql } from 'graphql-request';

export const detachBoardsFromSchemaMutationDev = gql`
  mutation DetachBoardsFromSchema($boardIds: [ID!]!) {
    detach_boards_from_schema(board_ids: $boardIds) {
      board_id
      success
      error
    }
  }
`;
