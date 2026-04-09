import { gql } from 'graphql-request';
export const getAccountSlug = gql`
  query getAccountSlug {
    me {
      account {
        slug
      }
    }
  }
`;
