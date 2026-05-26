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
    "\n  query getAgentKnowledge($id: ID!) {\n    agent_knowledge(id: $id) {\n      resources {\n        resource_id\n        scope_type\n        permission_type\n      }\n      files {\n        id\n        file_name\n        file_type\n      }\n    }\n  }\n": typeof types.GetAgentKnowledgeDocument,
    "\n  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n": typeof types.AddAgentResourceAccessDocument,
    "\n  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {\n    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {\n      success\n    }\n  }\n": typeof types.RemoveAgentResourceAccessDocument,
    "\n  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n": typeof types.UpdateAgentResourceAccessDocument,
    "\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n": typeof types.AgentFieldsFragmentDoc,
    "\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n": typeof types.GetAgentsDocument,
    "\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": typeof types.CreateAgentDocument,
    "\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": typeof types.CreateBlankAgentDocument,
    "\n  \n\n  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {\n    update_agent(id: $id, input: $input) {\n      ...AgentFields\n    }\n  }\n": typeof types.UpdateAgentDocument,
    "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n": typeof types.DeleteAgentDocument,
    "\n  mutation activateAgent($id: ID!) {\n    activate_agent(id: $id) {\n      success\n    }\n  }\n": typeof types.ActivateAgentDocument,
    "\n  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {\n    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {\n      success\n    }\n  }\n": typeof types.DeactivateAgentDocument,
    "\n  mutation runAgent($id: ID!) {\n    run_agent(id: $id) {\n      trigger_uuid\n    }\n  }\n": typeof types.RunAgentDocument,
    "\n  query getAgentActiveTriggers($agent_id: ID!) {\n    agent_active_triggers(agent_id: $agent_id) {\n      node_id\n      block_reference_id\n      name\n      description\n      field_summary\n    }\n  }\n": typeof types.GetAgentActiveTriggersDocument,
    "\n  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {\n    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {\n      success\n    }\n  }\n": typeof types.AddTriggerToAgentDocument,
    "\n  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {\n    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {\n      success\n    }\n  }\n": typeof types.RemoveTriggerFromAgentDocument,
    "\n  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {\n    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n": typeof types.AddSkillToAgentDocument,
    "\n  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {\n    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n": typeof types.RemoveSkillFromAgentDocument,
    "\n  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {\n    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {\n      block_reference_id\n      name\n      description\n      field_schemas {\n        field_key\n        value_schema\n      }\n      required_fields {\n        field_key\n        depends_on\n        optional\n      }\n    }\n  }\n": typeof types.GetAgentTriggersCatalogDocument,
    "\n  query getAgentSkillsCatalog {\n    agent_skills_catalog {\n      id\n      name\n      description\n    }\n  }\n": typeof types.GetAgentSkillsCatalogDocument,
    "\n  mutation createAgentSkill($name: String!, $content: String!, $description: String) {\n    create_agent_skill(name: $name, content: $content, description: $description) {\n      id\n      name\n      description\n    }\n  }\n": typeof types.CreateAgentSkillDocument,
    "\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": typeof types.DeleteObjectSchemaColumnsDocument,
    "\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n": typeof types.CompleteUploadDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n": typeof types.CreateUploadDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SearchItemsDevDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": typeof types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": typeof types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": typeof types.GetUserContextDocument,
    "\n  mutation activateLiveWorkflow($id: ID!) {\n    activate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.ActivateLiveWorkflowDocument,
    "\n  mutation deactivateLiveWorkflow($id: ID!) {\n    deactivate_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.DeactivateLiveWorkflowDocument,
    "\n  mutation deleteLiveWorkflow($id: ID!) {\n    delete_live_workflow(id: $id) {\n      is_success\n    }\n  }\n": typeof types.DeleteLiveWorkflowDocument,
    "\n  mutation CreateFormSubmission(\n    $form_token: String!\n    $answers: [FormAnswerInput!]!\n    $form_timezone_offset: Int!\n    $password: String\n    $tags: [TagInput!]\n  ) {\n    create_form_submission(\n      form_token: $form_token\n      answers: $answers\n      form_timezone_offset: $form_timezone_offset\n      password: $password\n      tags: $tags\n    ) {\n      id\n    }\n  }\n": typeof types.CreateFormSubmissionDocument,
};
const documents: Documents = {
    "\n  query getAgentKnowledge($id: ID!) {\n    agent_knowledge(id: $id) {\n      resources {\n        resource_id\n        scope_type\n        permission_type\n      }\n      files {\n        id\n        file_name\n        file_type\n      }\n    }\n  }\n": types.GetAgentKnowledgeDocument,
    "\n  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n": types.AddAgentResourceAccessDocument,
    "\n  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {\n    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {\n      success\n    }\n  }\n": types.RemoveAgentResourceAccessDocument,
    "\n  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n": types.UpdateAgentResourceAccessDocument,
    "\n  fragment AgentFields on Agent {\n    id\n    kind\n    state\n    profile {\n      name\n      role\n      role_description\n      avatar_url\n      background_color\n    }\n    goal\n    plan\n    user_prompt\n    version_id\n    created_at\n    updated_at\n  }\n": types.AgentFieldsFragmentDoc,
    "\n  \n\n  query getAgents($ids: [ID!], $limit: Int) {\n    agents(ids: $ids, limit: $limit) {\n      ...AgentFields\n    }\n  }\n": types.GetAgentsDocument,
    "\n  \n\n  mutation createAgent($input: CreateAgentInput!) {\n    create_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": types.CreateAgentDocument,
    "\n  \n\n  mutation createBlankAgent($input: CreateBlankAgentInput) {\n    create_blank_agent(input: $input) {\n      ...AgentFields\n    }\n  }\n": types.CreateBlankAgentDocument,
    "\n  \n\n  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {\n    update_agent(id: $id, input: $input) {\n      ...AgentFields\n    }\n  }\n": types.UpdateAgentDocument,
    "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n": types.DeleteAgentDocument,
    "\n  mutation activateAgent($id: ID!) {\n    activate_agent(id: $id) {\n      success\n    }\n  }\n": types.ActivateAgentDocument,
    "\n  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {\n    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {\n      success\n    }\n  }\n": types.DeactivateAgentDocument,
    "\n  mutation runAgent($id: ID!) {\n    run_agent(id: $id) {\n      trigger_uuid\n    }\n  }\n": types.RunAgentDocument,
    "\n  query getAgentActiveTriggers($agent_id: ID!) {\n    agent_active_triggers(agent_id: $agent_id) {\n      node_id\n      block_reference_id\n      name\n      description\n      field_summary\n    }\n  }\n": types.GetAgentActiveTriggersDocument,
    "\n  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {\n    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {\n      success\n    }\n  }\n": types.AddTriggerToAgentDocument,
    "\n  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {\n    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {\n      success\n    }\n  }\n": types.RemoveTriggerFromAgentDocument,
    "\n  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {\n    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n": types.AddSkillToAgentDocument,
    "\n  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {\n    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n": types.RemoveSkillFromAgentDocument,
    "\n  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {\n    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {\n      block_reference_id\n      name\n      description\n      field_schemas {\n        field_key\n        value_schema\n      }\n      required_fields {\n        field_key\n        depends_on\n        optional\n      }\n    }\n  }\n": types.GetAgentTriggersCatalogDocument,
    "\n  query getAgentSkillsCatalog {\n    agent_skills_catalog {\n      id\n      name\n      description\n    }\n  }\n": types.GetAgentSkillsCatalogDocument,
    "\n  mutation createAgentSkill($name: String!, $content: String!, $description: String) {\n    create_agent_skill(name: $name, content: $content, description: $description) {\n      id\n      name\n      description\n    }\n  }\n": types.CreateAgentSkillDocument,
    "\n  mutation DeleteObjectSchemaColumns($objectSchemaId: ID, $objectSchemaName: String, $columnIds: [ID!]!) {\n    delete_object_schema_columns(object_schema_id: $objectSchemaId, object_schema_name: $objectSchemaName, column_ids: $columnIds) {\n      id\n      name\n      description\n      parent_id\n      revision\n    }\n  }\n": types.DeleteObjectSchemaColumnsDocument,
    "\n  mutation CompleteUpload($input: CompleteUploadInput!) {\n    complete_upload(input: $input) {\n      id\n      filename\n      content_type\n      file_size\n      url\n      created_at\n      filelink\n    }\n  }\n": types.CompleteUploadDocument,
    "\n  mutation CreateUpload($input: CreateUploadInput!) {\n    create_upload(input: $input) {\n      upload_id\n      parts {\n        part_number\n        url\n        size_range_start\n        size_range_end\n      }\n      part_size\n      expires_at\n    }\n  }\n": types.CreateUploadDocument,
    "\n  query SearchItemsDev($query: String!, $limit: Int, $boardIds: [ID!]) {\n    search {\n      items(query: $query, limit: $limit, board_ids: $boardIds) {\n        results {\n          id\n        }\n      }\n    }\n  }\n": types.SearchItemsDevDocument,
    "\n  query SearchBoardsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      boards(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n            url\n          }\n        }\n      }\n    }\n  }\n": types.SearchBoardsDevDocument,
    "\n  query SearchDocsDev($query: String!, $limit: Int, $workspaceIds: [ID!]) {\n    search {\n      docs(query: $query, limit: $limit, workspace_ids: $workspaceIds) {\n        results {\n          id\n          indexed_data {\n            id\n            name\n          }\n        }\n      }\n    }\n  }\n": types.SearchDocsDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n      account {\n        tier\n        active_members_count\n        is_during_trial\n        products {\n          kind\n          tier\n        }\n      }\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": types.GetUserContextDocument,
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
export function graphql(source: "\n  query getAgentKnowledge($id: ID!) {\n    agent_knowledge(id: $id) {\n      resources {\n        resource_id\n        scope_type\n        permission_type\n      }\n      files {\n        id\n        file_name\n        file_type\n      }\n    }\n  }\n"): (typeof documents)["\n  query getAgentKnowledge($id: ID!) {\n    agent_knowledge(id: $id) {\n      resources {\n        resource_id\n        scope_type\n        permission_type\n      }\n      files {\n        id\n        file_name\n        file_type\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation addAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    add_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {\n    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation removeAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!) {\n    remove_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation updateAgentResourceAccess($id: ID!, $resource_id: ID!, $scope_type: KnowledgeScope!, $permission_type: KnowledgePermission!) {\n    update_agent_resource_access(id: $id, resource_id: $resource_id, scope_type: $scope_type, permission_type: $permission_type) {\n      success\n    }\n  }\n"];
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
export function graphql(source: "\n  \n\n  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {\n    update_agent(id: $id, input: $input) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  mutation updateAgent($id: ID!, $input: UpdateAgentInput!) {\n    update_agent(id: $id, input: $input) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n"): (typeof documents)["\n  \n\n  mutation deleteAgent($id: ID!) {\n    delete_agent(id: $id) {\n      ...AgentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation activateAgent($id: ID!) {\n    activate_agent(id: $id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation activateAgent($id: ID!) {\n    activate_agent(id: $id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {\n    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation deactivateAgent($id: ID!, $inactive_reason: InactiveReason) {\n    deactivate_agent(id: $id, inactive_reason: $inactive_reason) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation runAgent($id: ID!) {\n    run_agent(id: $id) {\n      trigger_uuid\n    }\n  }\n"): (typeof documents)["\n  mutation runAgent($id: ID!) {\n    run_agent(id: $id) {\n      trigger_uuid\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getAgentActiveTriggers($agent_id: ID!) {\n    agent_active_triggers(agent_id: $agent_id) {\n      node_id\n      block_reference_id\n      name\n      description\n      field_summary\n    }\n  }\n"): (typeof documents)["\n  query getAgentActiveTriggers($agent_id: ID!) {\n    agent_active_triggers(agent_id: $agent_id) {\n      node_id\n      block_reference_id\n      name\n      description\n      field_summary\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {\n    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation addTriggerToAgent($agent_id: ID!, $block_reference_id: ID!, $field_values: JSON) {\n    add_trigger_to_agent(agent_id: $agent_id, block_reference_id: $block_reference_id, field_values: $field_values) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {\n    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation removeTriggerFromAgent($agent_id: ID!, $node_id: ID!) {\n    remove_trigger_from_agent(agent_id: $agent_id, node_id: $node_id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {\n    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation addSkillToAgent($agent_id: ID!, $skill_id: ID!) {\n    add_skill_to_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {\n    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation removeSkillFromAgent($agent_id: ID!, $skill_id: ID!) {\n    remove_skill_from_agent(agent_id: $agent_id, skill_id: $skill_id) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {\n    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {\n      block_reference_id\n      name\n      description\n      field_schemas {\n        field_key\n        value_schema\n      }\n      required_fields {\n        field_key\n        depends_on\n        optional\n      }\n    }\n  }\n"): (typeof documents)["\n  query getAgentTriggersCatalog($block_reference_ids: [ID!]) {\n    agent_triggers_catalog(block_reference_ids: $block_reference_ids) {\n      block_reference_id\n      name\n      description\n      field_schemas {\n        field_key\n        value_schema\n      }\n      required_fields {\n        field_key\n        depends_on\n        optional\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getAgentSkillsCatalog {\n    agent_skills_catalog {\n      id\n      name\n      description\n    }\n  }\n"): (typeof documents)["\n  query getAgentSkillsCatalog {\n    agent_skills_catalog {\n      id\n      name\n      description\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation createAgentSkill($name: String!, $content: String!, $description: String) {\n    create_agent_skill(name: $name, content: $content, description: $description) {\n      id\n      name\n      description\n    }\n  }\n"): (typeof documents)["\n  mutation createAgentSkill($name: String!, $content: String!, $description: String) {\n    create_agent_skill(name: $name, content: $content, description: $description) {\n      id\n      name\n      description\n    }\n  }\n"];
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