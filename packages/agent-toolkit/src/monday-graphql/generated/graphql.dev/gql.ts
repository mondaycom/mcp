/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation ConnectBoardToSchema($boardId: ID!, $schemaId: ID, $schemaName: String) {\n    connect_board_to_schema(board_id: $boardId, schema_id: $schemaId, schema_name: $schemaName) {\n      id\n      entity_id\n    }\n  }\n": typeof types.ConnectBoardToSchemaDocument,
    "\n  mutation CreateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [CreateEntityColumnInput!]!) {\n    create_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.CreateSchemaColumnsDocument,
    "\n  mutation CreateSchema($name: String!, $parentId: ID, $description: String) {\n    create_schema(name: $name, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n    }\n  }\n": typeof types.CreateSchemaDocument,
    "\n  mutation DeactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    deactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.DeactivateSchemaColumnDocument,
    "\n  mutation DeleteSchemaColumns($entityId: ID, $entityName: String, $columnIds: [ID!]!) {\n    delete_entity_columns(entity_id: $entityId, entity_name: $entityName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.DeleteSchemaColumnsDocument,
    "\n  mutation DeleteSchema($id: ID, $name: String) {\n    delete_schema(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": typeof types.DeleteSchemaDocument,
    "\n  mutation DetachBoardsFromSchema($boardIds: [ID!]!) {\n    detach_boards_from_schema(board_ids: $boardIds) {\n      board_id\n      success\n      error\n    }\n  }\n": typeof types.DetachBoardsFromSchemaDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SearchItemsDevDocument,
    "\n  query GetSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int) {\n    get_schemas(ids: $ids, names: $names, limit: $limit, page: $page) {\n      id\n      name\n      description\n      parent_id\n      revision\n      account_id\n    }\n  }\n": typeof types.GetSchemasDocument,
    "\n  mutation OptInSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_in_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.OptInSchemaColumnDocument,
    "\n  mutation OptOutSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_out_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.OptOutSchemaColumnDocument,
    "\n  mutation ReactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    reactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.ReactivateSchemaColumnDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": typeof types.BatchUndoDocument,
    "\n  mutation UpdateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [UpdateEntityColumnInput!]!) {\n    update_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.UpdateSchemaColumnsDocument,
    "\n  mutation UpdateSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {\n    update_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.UpdateSchemaDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": typeof types.GetUserContextDocument,
};
const documents: Documents = {
    "\n  mutation ConnectBoardToSchema($boardId: ID!, $schemaId: ID, $schemaName: String) {\n    connect_board_to_schema(board_id: $boardId, schema_id: $schemaId, schema_name: $schemaName) {\n      id\n      entity_id\n    }\n  }\n": types.ConnectBoardToSchemaDocument,
    "\n  mutation CreateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [CreateEntityColumnInput!]!) {\n    create_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.CreateSchemaColumnsDocument,
    "\n  mutation CreateSchema($name: String!, $parentId: ID, $description: String) {\n    create_schema(name: $name, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n    }\n  }\n": types.CreateSchemaDocument,
    "\n  mutation DeactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    deactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.DeactivateSchemaColumnDocument,
    "\n  mutation DeleteSchemaColumns($entityId: ID, $entityName: String, $columnIds: [ID!]!) {\n    delete_entity_columns(entity_id: $entityId, entity_name: $entityName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.DeleteSchemaColumnsDocument,
    "\n  mutation DeleteSchema($id: ID, $name: String) {\n    delete_schema(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": types.DeleteSchemaDocument,
    "\n  mutation DetachBoardsFromSchema($boardIds: [ID!]!) {\n    detach_boards_from_schema(board_ids: $boardIds) {\n      board_id\n      success\n      error\n    }\n  }\n": types.DetachBoardsFromSchemaDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": types.SearchItemsDevDocument,
    "\n  query GetSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int) {\n    get_schemas(ids: $ids, names: $names, limit: $limit, page: $page) {\n      id\n      name\n      description\n      parent_id\n      revision\n      account_id\n    }\n  }\n": types.GetSchemasDocument,
    "\n  mutation OptInSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_in_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.OptInSchemaColumnDocument,
    "\n  mutation OptOutSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_out_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.OptOutSchemaColumnDocument,
    "\n  mutation ReactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    reactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.ReactivateSchemaColumnDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": types.BatchUndoDocument,
    "\n  mutation UpdateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [UpdateEntityColumnInput!]!) {\n    update_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.UpdateSchemaColumnsDocument,
    "\n  mutation UpdateSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {\n    update_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.UpdateSchemaDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": types.GetUserContextDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int) {\n    get_schemas(ids: $ids, names: $names, limit: $limit, page: $page) {\n      id\n      name\n      description\n      parent_id\n      revision\n      account_id\n    }\n  }\n"): (typeof documents)["\n  query GetSchemas($ids: [ID!], $names: [String!], $limit: Int, $page: Int) {\n    get_schemas(ids: $ids, names: $names, limit: $limit, page: $page) {\n      id\n      name\n      description\n      parent_id\n      revision\n      account_id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation OptInSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_in_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation OptInSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_in_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation OptOutSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_out_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation OptOutSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    opt_out_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ReactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    reactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation ReactivateSchemaColumn($schemaId: ID, $schemaName: String, $columnId: ID!) {\n    reactivate_schema_column(schema_id: $schemaId, schema_name: $schemaName, column_id: $columnId) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [UpdateEntityColumnInput!]!) {\n    update_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSchemaColumns($schemaId: ID, $schemaName: String, $columns: [UpdateEntityColumnInput!]!) {\n    update_schema_columns(schema_id: $schemaId, schema_name: $schemaName, columns: $columns) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {\n    update_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSchema($id: ID!, $revision: Int!, $parentId: ID, $description: String) {\n    update_schema(id: $id, revision: $revision, parent_id: $parentId, description: $description) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;