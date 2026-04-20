import { gql } from 'graphql-request';

export const createSchemaColumnsMutationDev = gql`
  mutation CreateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [CreateEntityColumnInput!]!) {
    create_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
