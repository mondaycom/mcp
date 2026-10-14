import { gql } from 'graphql-request';

export const createView = gql`
  mutation createView(
    $boardId: ID!
    $type: ViewKind!
    $name: String
    $filter: ItemsQueryGroup
    $sort: [ItemsQueryOrderBy!]
    $settings: JSON
  ) {
    create_view(
      board_id: $boardId
      type: $type
      name: $name
      filter: $filter
      sort: $sort
      settings: $settings
    ) {
      id
      name
      type
    }
  }
`;
