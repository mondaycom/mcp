import { gql } from 'graphql-request';

export const getUserContextQuery = gql`
  query getUserContext {
    me {
      id
      name
      title
      created_at
      account {
        tier
        active_members_count
        is_during_trial
        created_at
        products {
          kind
          tier
        }
      }
    }
    boards(limit: 25, state: active) {
      id
      type
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
      relevant_docs(limit: 10) {
        id
        object_id
        document {
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
