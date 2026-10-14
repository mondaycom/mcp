import { gql } from 'graphql-request';

export const updateViewTable = gql`
  mutation updateViewTable(
    $viewId: ID!
    $boardId: ID!
    $name: String
    $filter: ItemsQueryGroup
    $sort: [ItemsQueryOrderBy!]
    $tags: [String!]
    $settings: TableViewSettingsInput
  ) {
    update_view_table(
      view_id: $viewId
      board_id: $boardId
      name: $name
      filter: $filter
      sort: $sort
      tags: $tags
      settings: $settings
    ) {
      id
      name
      type
    }
  }
`;
