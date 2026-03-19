import { gql } from 'graphql-request';

export const batchUndoMutation = gql`
  mutation BatchUndo($boardId: ID!, $undoRecordId: String!) {
    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId)
  }
`;
