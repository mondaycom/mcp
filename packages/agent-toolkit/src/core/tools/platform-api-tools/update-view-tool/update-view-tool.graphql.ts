import { gql } from 'graphql-request';

export const updateView = gql`
  mutation updateView(
    $viewId: ID!
    $boardId: ID!
    $type: ViewKind!
    $name: String
    $filter: ItemsQueryGroup
    $sort: [ItemsQueryOrderBy!]
    $settings: JSON
  ) {
    update_view(
      view_id: $viewId
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
