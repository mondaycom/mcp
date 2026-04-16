import { gql } from 'graphql-request';

export const updateSchemaColumnsMutationDev = gql`
  mutation UpdateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [UpdateEntityColumnInput!]!) {
    update_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
