import { gql } from 'graphql-request';

export const getBoardItemsPage = gql`
  query GetBoardItemsPage($boardId: ID!, $limit: Int, $cursor: String, $includeColumns: Boolean!, $columnIds: [String!], $queryParams: ItemsQuery) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $limit, cursor: $cursor, query_params: $queryParams) {
        items {
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
        cursor
      }
    }
  }
`;