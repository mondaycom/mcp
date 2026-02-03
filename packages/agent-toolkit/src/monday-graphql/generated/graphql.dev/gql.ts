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
    "\n  query SearchItemsDev($searchTerm: String!, $board_ids: [ID!]) {\n    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {\n      results {\n        data {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SearchItemsDevDocument,
    "\n  query SearchDev($query: String!, $size: Int!, $entityTypes: [SearchableEntity!], $workspaceIds: [ID!]) {\n    search(query: $query, size: $size, entity_types: $entityTypes, workspace_ids: $workspaceIds) {\n      __typename\n      ... on CrossEntityBoardResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on CrossEntityDocResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n": typeof types.SearchDevDocument,
    "\n  query getUserContextDev {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards {\n        id\n        board {\n          name\n        }\n      }\n    }\n  }\n": typeof types.GetUserContextDevDocument,
    "\n  query getFavoriteDetailsDev(\n    $boardIds: [ID!]\n    $folderIds: [ID!]\n    $workspaceIds: [ID!]\n    $dashboardIds: [ID!]\n  ) {\n    boards(ids: $boardIds) {\n      id\n      name\n    }\n    folders(ids: $folderIds) {\n      id\n      name\n    }\n    workspaces(ids: $workspaceIds) {\n      id\n      name\n    }\n    dashboards: boards(ids: $dashboardIds) {\n      id\n      name\n    }\n  }\n": typeof types.GetFavoriteDetailsDevDocument,
};
const documents: Documents = {
    "\n  query SearchItemsDev($searchTerm: String!, $board_ids: [ID!]) {\n    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {\n      results {\n        data {\n          id\n        }\n      }\n    }\n  }\n": types.SearchItemsDevDocument,
    "\n  query SearchDev($query: String!, $size: Int!, $entityTypes: [SearchableEntity!], $workspaceIds: [ID!]) {\n    search(query: $query, size: $size, entity_types: $entityTypes, workspace_ids: $workspaceIds) {\n      __typename\n      ... on CrossEntityBoardResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on CrossEntityDocResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.SearchDevDocument,
    "\n  query getUserContextDev {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards {\n        id\n        board {\n          name\n        }\n      }\n    }\n  }\n": types.GetUserContextDevDocument,
    "\n  query getFavoriteDetailsDev(\n    $boardIds: [ID!]\n    $folderIds: [ID!]\n    $workspaceIds: [ID!]\n    $dashboardIds: [ID!]\n  ) {\n    boards(ids: $boardIds) {\n      id\n      name\n    }\n    folders(ids: $folderIds) {\n      id\n      name\n    }\n    workspaces(ids: $workspaceIds) {\n      id\n      name\n    }\n    dashboards: boards(ids: $dashboardIds) {\n      id\n      name\n    }\n  }\n": types.GetFavoriteDetailsDevDocument,
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
export function graphql(source: "\n  query SearchItemsDev($searchTerm: String!, $board_ids: [ID!]) {\n    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {\n      results {\n        data {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchItemsDev($searchTerm: String!, $board_ids: [ID!]) {\n    search_items(board_ids: $board_ids, query: $searchTerm, size: 100) {\n      results {\n        data {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchDev($query: String!, $size: Int!, $entityTypes: [SearchableEntity!], $workspaceIds: [ID!]) {\n    search(query: $query, size: $size, entity_types: $entityTypes, workspace_ids: $workspaceIds) {\n      __typename\n      ... on CrossEntityBoardResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on CrossEntityDocResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchDev($query: String!, $size: Int!, $entityTypes: [SearchableEntity!], $workspaceIds: [ID!]) {\n    search(query: $query, size: $size, entity_types: $entityTypes, workspace_ids: $workspaceIds) {\n      __typename\n      ... on CrossEntityBoardResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on CrossEntityDocResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getUserContextDev {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards {\n        id\n        board {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getUserContextDev {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards {\n        id\n        board {\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getFavoriteDetailsDev(\n    $boardIds: [ID!]\n    $folderIds: [ID!]\n    $workspaceIds: [ID!]\n    $dashboardIds: [ID!]\n  ) {\n    boards(ids: $boardIds) {\n      id\n      name\n    }\n    folders(ids: $folderIds) {\n      id\n      name\n    }\n    workspaces(ids: $workspaceIds) {\n      id\n      name\n    }\n    dashboards: boards(ids: $dashboardIds) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  query getFavoriteDetailsDev(\n    $boardIds: [ID!]\n    $folderIds: [ID!]\n    $workspaceIds: [ID!]\n    $dashboardIds: [ID!]\n  ) {\n    boards(ids: $boardIds) {\n      id\n      name\n    }\n    folders(ids: $folderIds) {\n      id\n      name\n    }\n    workspaces(ids: $workspaceIds) {\n      id\n      name\n    }\n    dashboards: boards(ids: $dashboardIds) {\n      id\n      name\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;