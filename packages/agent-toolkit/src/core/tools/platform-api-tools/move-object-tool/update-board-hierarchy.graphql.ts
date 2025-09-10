import { gql } from 'graphql-request';

export const updateBoardHierarchy = gql`
  mutation updateBoardHierarchy($boardId: ID!, $attributes: UpdateBoardHierarchyAttributesInput!) {
    update_board_hierarchy(board_id: $boardId, attributes: $attributes) {
      success
      message
      board {
        id
      }
    }
  }
`;
