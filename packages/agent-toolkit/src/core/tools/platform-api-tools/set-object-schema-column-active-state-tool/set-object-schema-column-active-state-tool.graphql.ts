import { gql } from 'graphql-request';

export const setObjectSchemaColumnActiveStateMutation = gql`
  mutation SetObjectSchemaColumnActiveState($objectSchemaId: ID, $objectSchemaName: String, $columnId: ID!, $action: ColumnActiveStateAction!) {
    set_object_schema_column_active_state(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_id: $columnId, action: $action) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
