import { gql } from 'graphql-request';

export const getBoardItemsPage = gql`
  query GetBoardItemsPage($boardId: ID!, $limit: Int, $cursor: String, $includeColumns: Boolean!) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $limit, cursor: $cursor) {
        items {
          id
          name
          created_at
          updated_at
          column_values @include(if: $includeColumns) {
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