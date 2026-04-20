import { gql } from 'graphql-request';

export const reactivateSchemaColumnMutationDev = gql`
  mutation ReactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {
    reactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
