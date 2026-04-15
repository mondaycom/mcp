import { gql } from 'graphql-request';

export const getSchemasMutationDev = gql`
  query GetSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int) {
    get_schemas(ids: $ids, names: $names, limit: $limit, page: $page) {
      id
      name
      description
      parent_id
      revision
      account_id
    }
  }
`;
