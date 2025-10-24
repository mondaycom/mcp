import { gql } from 'graphql-request';

export const getRecentBoards = gql`
  query GetRecentBoards($limit: Int) {
    boards(limit: $limit, order_by: used_at, state: active) {
      id
      name
      workspace {
        id
        name
      }
      columns {
        id
        type
        settings
      }
    }
  }
`;

