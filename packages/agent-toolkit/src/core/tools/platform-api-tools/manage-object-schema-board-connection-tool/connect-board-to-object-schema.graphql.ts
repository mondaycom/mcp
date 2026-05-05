import { gql } from 'graphql-request';

export const connectBoardToObjectSchemaMutation = gql`
  mutation ConnectBoardToObjectSchema($boardId: ID!, $objectSchemaId: ID, $objectSchemaName: String) {
    connect_board_to_object_schema(board_id: $boardId, object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName) {
      id
      object_schema_id
    }
  }
`;
