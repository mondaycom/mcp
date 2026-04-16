import { gql } from 'graphql-request';

export const optOutSchemaColumnMutationDev = gql`
  mutation OptOutSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {
    opt_out_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
