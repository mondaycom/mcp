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
    "\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n": typeof types.AgentFieldsFragmentDoc,
    "\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n": typeof types.GetAgentsDocument,
    "\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": typeof types.CreateAgentDocument,
    "\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": typeof types.CreateBlankAgentDocument,
    "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n": typeof types.DeleteAgentDocument,
    "\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.DeleteObjectSchemaColumnsDocument,
    "\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n": typeof types.CompleteUploadDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n": typeof types.CreateUploadDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SearchItemsDevDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": typeof types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": typeof types.GetUserContextDocument,
    "\n  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {\n    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {\n      id\n      user_id\n      is_active\n      title\n      description\n      created_at\n      updated_at\n      workflow_host_data {\n        id\n        type\n      }\n      workflow_blocks {\n        workflowNodeId\n        blockReferenceId\n        title\n        kind\n      }\n      workflow_variables\n      importance\n      notice_message\n      template_reference_id\n    }\n  }\n": typeof types.GetLiveWorkflowsDocument,
    "\n  mutation activateLiveWorkflow($id: ID!) {\n    activate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.ActivateLiveWorkflowDocument,
    "\n  mutation deactivateLiveWorkflow($id: ID!) {\n    deactivate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.DeactivateLiveWorkflowDocument,
    "\n  mutation deleteLiveWorkflow($id: ID!) {\n    delete_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.DeleteLiveWorkflowDocument,
    "\n  mutation CreateFormSubmission(\n    $form_token: String!\n    $answers: [FormAnswerInput!]!\n    $form_timezone_offset: Int!\n    $password: String\n    $tags: [TagInput!]\n  ) {\n    create_form_submission(\n      form_token: $form_token\n      answers: $answers\n      form_timezone_offset: $form_timezone_offset\n      password: $password\n      tags: $tags\n    ) {\n      id\n    }\n  }\n": typeof types.CreateFormSubmissionDocument,
};
const documents: Documents = {
    "\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n": types.AgentFieldsFragmentDoc,
    "\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n": types.GetAgentsDocument,
    "\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": types.CreateAgentDocument,
    "\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": types.CreateBlankAgentDocument,
    "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n": types.DeleteAgentDocument,
    "\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.DeleteObjectSchemaColumnsDocument,
    "\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n": types.CompleteUploadDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n": types.CreateUploadDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": types.SearchItemsDevDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": types.GetUserContextDocument,
    "\n  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {\n    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {\n      id\n      user_id\n      is_active\n      title\n      description\n      created_at\n      updated_at\n      workflow_host_data {\n        id\n        type\n      }\n      workflow_blocks {\n        workflowNodeId\n        blockReferenceId\n        title\n        kind\n      }\n      workflow_variables\n      importance\n      notice_message\n      template_reference_id\n    }\n  }\n": types.GetLiveWorkflowsDocument,
    "\n  mutation activateLiveWorkflow($id: ID!) {\n    activate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": types.ActivateLiveWorkflowDocument,
    "\n  mutation deactivateLiveWorkflow($id: ID!) {\n    deactivate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": types.DeactivateLiveWorkflowDocument,
    "\n  mutation deleteLiveWorkflow($id: ID!) {\n    delete_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": types.DeleteLiveWorkflowDocument,
    "\n  mutation CreateFormSubmission(\n    $form_token: String!\n    $answers: [FormAnswerInput!]!\n    $form_timezone_offset: Int!\n    $password: String\n    $tags: [TagInput!]\n  ) {\n    create_form_submission(\n      form_token: $form_token\n      answers: $answers\n      form_timezone_offset: $form_timezone_offset\n      password: $password\n      tags: $tags\n    ) {\n      id\n    }\n  }\n": types.CreateFormSubmissionDocument,
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
export function graphql(source: "\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n"): (typeof documents)["\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n"): (typeof documents)["\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n"): (typeof documents)["\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {\n    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {\n      id\n      user_id\n      is_active\n      title\n      description\n      created_at\n      updated_at\n      workflow_host_data {\n        id\n        type\n      }\n      workflow_blocks {\n        workflowNodeId\n        blockReferenceId\n        title\n        kind\n      }\n      workflow_variables\n      importance\n      notice_message\n      template_reference_id\n    }\n  }\n"): (typeof documents)["\n  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {\n    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {\n      id\n      user_id\n      is_active\n      title\n      description\n      created_at\n      updated_at\n      workflow_host_data {\n        id\n        type\n      }\n      workflow_blocks {\n        workflowNodeId\n        blockReferenceId\n        title\n        kind\n      }\n      workflow_variables\n      importance\n      notice_message\n      template_reference_id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation activateLiveWorkflow($id: ID!) {\n    activate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"): (typeof documents)["\n  mutation activateLiveWorkflow($id: ID!) {\n    activate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deactivateLiveWorkflow($id: ID!) {\n    deactivate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"): (typeof documents)["\n  mutation deactivateLiveWorkflow($id: ID!) {\n    deactivate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deleteLiveWorkflow($id: ID!) {\n    delete_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"): (typeof documents)["\n  mutation deleteLiveWorkflow($id: ID!) {\n    delete_live_workflow(id: $id) {\n      is_success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateFormSubmission(\n    $form_token: String!\n    $answers: [FormAnswerInput!]!\n    $form_timezone_offset: Int!\n    $password: String\n    $tags: [TagInput!]\n  ) {\n    create_form_submission(\n      form_token: $form_token\n      answers: $answers\n      form_timezone_offset: $form_timezone_offset\n      password: $password\n      tags: $tags\n    ) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation CreateFormSubmission(\n    $form_token: String!\n    $answers: [FormAnswerInput!]!\n    $form_timezone_offset: Int!\n    $password: String\n    $tags: [TagInput!]\n  ) {\n    create_form_submission(\n      form_token: $form_token\n      answers: $answers\n      form_timezone_offset: $form_timezone_offset\n      password: $password\n      tags: $tags\n    ) {\n      id\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;