import { gql } from 'graphql-request';

export const deactivateSchemaColumnMutationDev = gql`
  mutation DeactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {
    deactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
