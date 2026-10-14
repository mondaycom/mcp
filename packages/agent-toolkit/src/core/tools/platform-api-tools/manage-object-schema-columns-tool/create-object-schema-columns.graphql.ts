import { gql } from 'graphql-request';

export const createObjectSchemaColumnsMutation = gql`
  mutation CreateObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columns: [CreateObjectSchemaColumnInput!]!) {
    create_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, columns: $columns) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
