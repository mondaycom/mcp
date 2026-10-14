import { gql } from 'graphql-request';

export const getObjectSchemasQuery = gql`
  query GetObjectSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int, $excludeCreatedByMonday: Boolean) {
    get_object_schemas(ids: $ids, names: $names, limit: $limit, page: $page, exclude_created_by_monday: $excludeCreatedByMonday) {
      id
      name
      description
      parent_id
      revision
      account_id
      connected_boards_count
    }
  }
`;
