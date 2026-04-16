import { gql } from 'graphql-request';

export const optInSchemaColumnMutationDev = gql`
  mutation OptInSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {
    opt_in_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
