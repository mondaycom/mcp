import { gql } from 'graphql-request';

// TODO: Check if aggregation by person can return names

export const getBoardItemsPage = gql`
  fragment ItemDataFragment on Item {
    id
    name
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
  }
  
  query GetBoardItemsPage($boardId: ID!, $limit: Int, $cursor: String, $includeColumns: Boolean!, $columnIds: [String!], $queryParams: ItemsQuery, $includeSubItems: Boolean!) {
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

export const smartSearchGetBoardItemIds = gql`
  query SmartSearchBoardItemIds($searchTerm: String!, $board_ids: [ID!]) {
    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {
      results {
        data {
          id
        }
      }
    }
  }
`;