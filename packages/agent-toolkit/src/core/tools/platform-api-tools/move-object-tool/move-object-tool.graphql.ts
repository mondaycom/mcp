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

export const updateOverviewHierarchy = gql`
  mutation updateOverviewHierarchy($overviewId: ID!, $attributes: UpdateOverviewHierarchyAttributesInput!) {
    update_overview_hierarchy(overview_id: $overviewId, attributes: $attributes) {
      success
      message
      overview {
        id
      }
    }
  }
`;
