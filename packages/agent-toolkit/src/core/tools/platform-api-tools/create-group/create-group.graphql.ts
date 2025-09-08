import { gql } from 'graphql-request';

export const createGroup = gql`
  mutation createGroup(
    $boardId: ID!
    $groupName: String!
    $groupColor: String
    $relativeTo: String
    $positionRelativeMethod: PositionRelative
  ) {
    create_group(
      board_id: $boardId
      group_name: $groupName
      group_color: $groupColor
      relative_to: $relativeTo
      position_relative_method: $positionRelativeMethod
    ) {
      id
      title
    }
  }
`;
