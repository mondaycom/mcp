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
      relevant_boards(limit: 10) {
        id
        board {
          name
        }
      }
      relevant_people(limit: 10) {
        id
        user {
          name
        }
      }
    }
  }
`;
