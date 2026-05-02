import { gql } from 'graphql-request';

export const deleteObjectSchemaColumnsMutationDev = gql`
  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {
    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
