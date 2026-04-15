import { gql } from 'graphql-request';

export const deleteSchemaColumnsMutationDev = gql`
  mutation DeleteSchemaColumns($entityId: ID, $entityName: String, $columnIds: [ID!]!) {
    delete_entity_columns(entity_id: $entityId, entity_name: $entityName, column_ids: $columnIds) {
      id
      name
      description
      parent_id
      revision
    }
  }
`;
