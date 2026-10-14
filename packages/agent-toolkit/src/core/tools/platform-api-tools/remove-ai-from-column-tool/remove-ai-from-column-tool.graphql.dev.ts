import { gql } from 'graphql-request';

export const removeAiFromColumnMutation = gql`
  mutation RemoveAiFromColumn($boardId: ID!, $columnId: ID!) {
    remove_ai_from_column(board_id: $boardId, column_id: $columnId) {
      column_id
      success
    }
  }
`;
