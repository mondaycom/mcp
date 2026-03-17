import { gql } from 'graphql-request';

export const getBoardItemsPage = gql`
  fragment ItemDataFragment on Item {
    id
    name
    url
    created_at
    updated_at
    column_values(ids: $columnIds) @include(if: $includeColumns) {
      id
      type
      text
      value

      ... on FormulaValue {
        display_value
      }

      ... on BoardRelationValue {
        linked_items {
          id
          name
          board {
            id
            name
          }
        }
      }
    }
    description @include(if: $includeDescription) {
      id
      blocks {
        id
        type
        content
      }
    }
  }

  query GetBoardItemsPage(
    $boardId: ID!
    $limit: Int
    $cursor: String
    $includeColumns: Boolean!
    $columnIds: [String!]
    $queryParams: ItemsQuery
    $includeSubItems: Boolean!
    $includeDescription: Boolean!
  ) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $limit, cursor: $cursor, query_params: $queryParams) {
        items {
          ...ItemDataFragment

          subitems @include(if: $includeSubItems) {
            ...ItemDataFragment
          }
        }
        cursor
      }
    }
  }
`;
