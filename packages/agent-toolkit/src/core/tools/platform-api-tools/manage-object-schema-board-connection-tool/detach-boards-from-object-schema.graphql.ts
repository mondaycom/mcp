import { gql } from 'graphql-request';

export const detachBoardsFromObjectSchemaMutation = gql`
  mutation DetachBoardsFromObjectSchema($boardIds: [ID!]!) {
    detach_boards_from_object_schema(board_ids: $boardIds) {
      board_id
      success
      error
    }
  }
`;
