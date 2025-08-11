import { gql } from 'graphql-request';

export const getColumnTypeSchema = gql`
  query GetColumnTypeSchema($type: ColumnType!) {
    get_column_type_schema(type: $type)
  }
`; 