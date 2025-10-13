import { gql } from 'graphql-request';

export const getBoardItemsPage = gql`
  fragment ItemDataFragment on Item {
    id
    name
    created_at
    updated_at
    column_values(ids: $columnIds) @include(if: $includeColumns) {
      id
      text
      value
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
  query SmartSearchBoardItemIds($searchTerm: String!, $boardId: ID!) {
    search_items(boardId: $boardId, query: $searchTerm, searchType: LEXICAL, size: 100) {
      results {
        data {
          id
        }
      }
    }
  }
`;