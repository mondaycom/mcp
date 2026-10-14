import { gql } from 'graphql-request';

export const updateObjectSchemaColumnsMutation = gql`
  mutation UpdateObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columns: [UpdateObjectSchemaColumnInput!]!) {
    update_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, columns: $columns) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
