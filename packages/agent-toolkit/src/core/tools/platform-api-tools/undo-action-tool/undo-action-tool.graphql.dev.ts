import { gql } from 'graphql-request';

export const batchUndoMutationDev = gql`
  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {
    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {
      success
    }
  }
`;
