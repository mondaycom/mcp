import { gql } from 'graphql-request';

export const connectBoardToSchemaMutationDev = gql`
  mutation ConnectBoardToSchema($boardId: ID!, $schemaId: ID, $schemaName: String) {
    connect_board_to_schema(board_id: $boardId, schema_id: $schemaId, schema_name: $schemaName) {
      id
      entity_id
    }
  }
`;
