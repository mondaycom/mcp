import { gql } from 'graphql-request';

export const getUserContextQuery = gql`
  query getUserContext {
    me {
      id
      name
      title
    }
    favorites {
      object {
        id
        type
      }
    }
    intelligence {
      relevant_boards {
        id
        board {
          name
        }
      }
    }
  }
`;
