import { gql } from 'graphql-request';

<<<<<<< HEAD
export const getSchemasQueryDev = gql`
=======
export const getSchemasMutationDev = gql`
>>>>>>> 770d725 (feat(agent-toolkit): add data-structure schema management tools (v5.2.0))
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
