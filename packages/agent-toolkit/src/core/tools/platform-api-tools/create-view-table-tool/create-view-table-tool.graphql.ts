import { gql } from 'graphql-request';

export const createViewTable = gql`
  mutation createViewTable(
    $boardId: ID!
    $name: String
    $filter: ItemsQueryGroup
    $sort: [ItemsQueryOrderBy!]
    $tags: [String!]
    $settings: TableViewSettingsInput
  ) {
    create_view_table(
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
