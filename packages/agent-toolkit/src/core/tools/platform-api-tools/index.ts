import { AllMondayApiTool } from './all-monday-api-tool';
import { AllApiReadTool } from './all-api-read-tool';
import { AllApiWriteTool } from './all-api-write-tool';
import { BaseMondayApiToolConstructor } from './base-monday-api-tool';
import { ChangeItemColumnValuesTool } from './change-item-column-values-tool';
import { ChangeItemsColumnValuesTool } from './change-items-column-values-tool/change-items-column-values-tool';
import { GetObjectSchemasTool } from './get-object-schemas-tool/get-object-schemas-tool';
import { CreateObjectSchemaTool } from './create-object-schema-tool/create-object-schema-tool';
import { UpdateObjectSchemaTool } from './update-object-schema-tool/update-object-schema-tool';
import { DeleteObjectSchemaTool } from './delete-object-schema-tool/delete-object-schema-tool';
import { DeleteObjectSchemaColumnsTool } from './delete-object-schema-columns-tool/delete-object-schema-columns-tool';
import { ManageObjectSchemaBoardConnectionTool } from './manage-object-schema-board-connection-tool/manage-object-schema-board-connection-tool';
import { ManageObjectSchemaColumnsTool } from './manage-object-schema-columns-tool/manage-object-schema-columns-tool';
import { SetObjectSchemaColumnActiveStateTool } from './set-object-schema-column-active-state-tool/set-object-schema-column-active-state-tool';
import { CreateBoardTool } from './create-board-tool';
import { UseTemplateTool } from './use-template-tool';
import { CheckTemplateStatusTool } from './check-template-status-tool';
import { CreateViewTool } from './create-view-tool/create-view-tool';
import { UpdateViewTool } from './update-view-tool/update-view-tool';
import { CreateViewTableTool } from './create-view-table-tool/create-view-table-tool';
import { UpdateViewTableTool } from './update-view-table-tool/update-view-table-tool';
import { CreateFormTool } from './workforms-tools/create-form-tool';
import { FormQuestionsEditorTool } from './workforms-tools/form-questions-editor-tool';
import { UpdateFormTool } from './workforms-tools/update-form-tool';
import { GetFormTool } from './workforms-tools/get-form-tool';
import { CreateSubmissionTool } from './workforms-tools/create-submission-tool';
import { CreateColumnTool } from './create-column-tool';
import { UpdateColumnTool } from './update-column-tool';
import { CreateCustomActivityTool } from './create-custom-activity-tool';
import { CreateNotificationTool } from './create-notification-tool/create-notification-tool';
import { CreateGroupTool } from './create-group/create-group-tool';
import { CreateItemTool } from './create-item-tool/create-item-tool';
import { CreateItemsTool } from './create-items-tool/create-items-tool';
import { CreateTimelineItemTool } from './create-timeline-item-tool';
import { CreateUpdateTool } from './create-update-tool/create-update-tool';
import { DeleteUpdateTool } from './delete-update-tool/delete-update-tool';
import { GetUpdatesTool } from './get-updates-tool/get-updates-tool';
import { DeleteColumnTool } from './delete-column-tool';
import { DeleteItemTool } from './delete-item-tool';
import { FetchCustomActivityTool } from './fetch-custom-activity-tool';
import { FullBoardDataTool } from './full-board-data-tool/full-board-data-tool';
import { GetBoardActivityTool } from './get-board-activity/get-board-activity-tool';
import { GetBoardInfoTool } from './get-board-info/get-board-info-tool';
import { GetBoardItemsPageTool } from './get-board-items-page-tool/get-board-items-page-tool';
import { GetBoardSchemaTool } from './get-board-schema-tool';
import { GetColumnTypeInfoTool } from './get-column-type-info/get-column-type-info-tool';
import { GetGraphQLSchemaTool } from './get-graphql-schema-tool';
import { GetTypeDetailsTool } from './get-type-details-tool';
import { ListUsersAndTeamsTool } from './list-users-and-teams-tool/list-users-and-teams-tool';
import { MoveItemToGroupTool } from './move-item-to-group-tool';
import { ReadDocsTool } from './read-docs-tool/read-docs-tool';
import { WorkspaceInfoTool } from './workspace-info-tool/workspace-info-tool';
import { ListWorkspaceTool } from './list-workspace-tool/list-workspace-tool';
import { CreateDocTool } from './create-doc-tool/create-doc-tool';
import { AddContentToDocTool } from './add-content-to-doc-tool/add-content-to-doc-tool';
import { UpdateDocTool } from './update-doc-tool/update-doc-tool';
import { CreateDashboardTool } from './dashboard-tools/create-dashboard-tool';
import { AllWidgetsSchemaTool } from './dashboard-tools/all-widgets-schema-tool';
import { CreateWidgetTool } from './dashboard-tools/create-widget-tool';
import { UpdateWorkspaceTool } from './update-workspace-tool/update-workspace-tool';
import { UpdateFolderTool } from './update-folder-tool/update-folder-tool';
import { CreateWorkspaceTool } from './create-workspace-tool/create-workspace-tool';
import { CreateFolderTool } from './create-folder-tool/create-folder-tool';
import { MoveObjectTool } from './move-object-tool/move-object-tool';
import { BoardInsightsTool } from './board-insights/board-insights-tool';
import { SearchTool } from './search-tool/search-tool';
import { CreateUpdateInMondayTool } from './create-update-tool-ui/create-update-ui-tool';
import { UpdateAssetsOnItemTool } from './update-assets-on-item-tool/update-assets-on-item-tool';
import { GetAssetsTool } from './get-assets-tool/get-assets-tool';
import { UserContextTool } from './user-context-tool/user-context-tool';
import { UndoActionTool } from './undo-action-tool/undo-action-tool';
import { GetAssetUploadUrlTool } from './get-asset-upload-url-tool/get-asset-upload-url-tool';
import { FinalizeAssetUploadTool } from './finalize-asset-upload-tool/finalize-asset-upload-tool';
import { LinkBoardItemsWorkflowTool } from './link-board-items-workflow-tool/link-board-items-workflow-tool';
import { FetchFileContentTool } from './fetch-file-content-tool/fetch-file-content-tool';
import { ManageAgentTool } from './agents-tools/manage-agent/manage-agent-tool';
import { ManageAgentTriggersTool } from './agents-tools/manage-agent-triggers/manage-agent-triggers-tool';
import { ManageAgentSkillsTool } from './agents-tools/manage-agent-skills/manage-agent-skills-tool';
import { ManageAgentKnowledgeTool } from './agents-tools/manage-agent-knowledge/manage-agent-knowledge-tool';
import { AgentCatalogTool } from './agents-tools/agent-catalog/agent-catalog-tool';
import { ListAutomationsTool } from './automations-tools/list-automations/list-automations-tool';
import { ManageAutomationsTool } from './automations-tools/manage-automations/manage-automations-tool';
import { CreateAutomationTool } from './automations-tools/create-automation/create-automation-tool';
import { GetAutomationRunsTool } from './automations-tools/get-automation-runs/get-automation-runs-tool';
import { GetAutomationStatisticsTool } from './automations-tools/get-automation-statistics/get-automation-statistics-tool';
import { CreateWorkflowBuilderTool } from './workflow-builder-tools/create-workflow/create-workflow-tool';
import { UpdateWorkflowTool } from './workflow-builder-tools/update-workflow/update-workflow-tool';
import { PlanWorkflowTool } from './workflow-builder-tools/plan-workflow/plan-workflow-tool';
import { PublishWorkflowTool } from './workflow-builder-tools/publish-workflow/publish-workflow-tool';
import { ConfigureAiColumnTool } from './configure-ai-column-tool/configure-ai-column-tool';
import { RemoveAiFromColumnTool } from './remove-ai-from-column-tool/remove-ai-from-column-tool';
import { SendFeedbackTool } from './send-feedback-tool/send-feedback-tool';
import { GetMondayKnowledgeTool } from './get-monday-knowledge/get-monday-knowledge';

export const allGraphqlApiTools: BaseMondayApiToolConstructor[] = [
  DeleteItemTool,
  GetBoardItemsPageTool,
  CreateItemTool,
  CreateItemsTool,
  CreateUpdateTool,
  DeleteUpdateTool,
  GetUpdatesTool,
  CreateUpdateInMondayTool,
  GetBoardSchemaTool,
  GetBoardActivityTool,
  GetBoardInfoTool,
  FullBoardDataTool,
  ListUsersAndTeamsTool,
  ChangeItemColumnValuesTool,
  ChangeItemsColumnValuesTool,
  MoveItemToGroupTool,
  CreateBoardTool,
  UseTemplateTool,
  CheckTemplateStatusTool,
  CreateFormTool,
  UpdateFormTool,
  GetFormTool,
  FormQuestionsEditorTool,
  CreateSubmissionTool,
  CreateColumnTool,
  UpdateColumnTool,
  CreateGroupTool,
  DeleteColumnTool,
  AllMondayApiTool,
  AllApiReadTool,
  AllApiWriteTool,
  GetGraphQLSchemaTool,
  GetColumnTypeInfoTool,
  GetTypeDetailsTool,
  CreateCustomActivityTool,
  CreateNotificationTool,
  CreateTimelineItemTool,
  FetchCustomActivityTool,
  ReadDocsTool,
  WorkspaceInfoTool,
  ListWorkspaceTool,
  CreateDocTool,
  AddContentToDocTool,
  UpdateDocTool,
  UpdateWorkspaceTool,
  UpdateFolderTool,
  CreateWorkspaceTool,
  CreateFolderTool,
  MoveObjectTool,
  // Dashboard Tools
  CreateDashboardTool,
  AllWidgetsSchemaTool,
  CreateWidgetTool,
  BoardInsightsTool,
  SearchTool,
  UserContextTool,
  UpdateAssetsOnItemTool,
  GetAssetsTool,
  CreateViewTool,
  UpdateViewTool,
  CreateViewTableTool,
  UpdateViewTableTool,
  UndoActionTool,
  GetObjectSchemasTool,
  CreateObjectSchemaTool,
  UpdateObjectSchemaTool,
  DeleteObjectSchemaTool,
  DeleteObjectSchemaColumnsTool,
  ManageObjectSchemaBoardConnectionTool,
  ManageObjectSchemaColumnsTool,
  SetObjectSchemaColumnActiveStateTool,
  GetAssetUploadUrlTool,
  FinalizeAssetUploadTool,
  LinkBoardItemsWorkflowTool,
  FetchFileContentTool,
  // monday Platform Agents (subgraph still on dev API version)
  ManageAgentTool,
  ManageAgentTriggersTool,
  ManageAgentSkillsTool,
  ManageAgentKnowledgeTool,
  AgentCatalogTool,
  // Automations (subgraph still on dev API version)
  ListAutomationsTool,
  ManageAutomationsTool,
  // Cast: ctor signature (api, apiToken, context?) doesn't match BaseMondayApiToolConstructor.
  CreateAutomationTool as unknown as BaseMondayApiToolConstructor,
  GetAutomationRunsTool,
  GetAutomationStatisticsTool,
  // Workflow Builder Tools
  CreateWorkflowBuilderTool,
  // Cast: ctor signature (api, apiToken, context?) doesn't match BaseMondayApiToolConstructor.
  UpdateWorkflowTool as unknown as BaseMondayApiToolConstructor,
  PlanWorkflowTool as unknown as BaseMondayApiToolConstructor,
  PublishWorkflowTool,
  // AI Column Tools
  ConfigureAiColumnTool,
  RemoveAiFromColumnTool,
  SendFeedbackTool,
  GetMondayKnowledgeTool,
];

export * from './all-monday-api-tool';
export * from './all-api-read-tool';
export * from './all-api-write-tool';
export * from './get-object-schemas-tool/get-object-schemas-tool';
export * from './create-object-schema-tool/create-object-schema-tool';
export * from './update-object-schema-tool/update-object-schema-tool';
export * from './delete-object-schema-tool/delete-object-schema-tool';
export * from './delete-object-schema-columns-tool/delete-object-schema-columns-tool';
export * from './manage-object-schema-board-connection-tool/manage-object-schema-board-connection-tool';
export * from './manage-object-schema-columns-tool/manage-object-schema-columns-tool';
export * from './set-object-schema-column-active-state-tool/set-object-schema-column-active-state-tool';
export * from './change-item-column-values-tool';
export * from './change-items-column-values-tool/change-items-column-values-tool';
export * from './create-board-tool';
export * from './use-template-tool';
export * from './check-template-status-tool';
export * from './workforms-tools/create-form-tool';
export * from './workforms-tools/update-form-tool';
export * from './workforms-tools/get-form-tool';
export * from './workforms-tools/form-questions-editor-tool';
export * from './workforms-tools/create-submission-tool';
export * from './create-column-tool';
export * from './update-column-tool';
export * from './create-group/create-group-tool';
export * from './create-custom-activity-tool';
export * from './create-notification-tool/create-notification-tool';
export * from './create-item-tool/create-item-tool';
export * from './create-items-tool/create-items-tool';
export * from './create-timeline-item-tool';
export * from './create-update-tool/create-update-tool';
export * from './delete-update-tool/delete-update-tool';
export * from './get-updates-tool/get-updates-tool';
export * from './create-view-tool/create-view-tool';
export * from './update-view-tool/update-view-tool';
export * from './create-view-table-tool/create-view-table-tool';
export * from './update-view-table-tool/update-view-table-tool';
export * from './delete-column-tool';
export * from './delete-item-tool';
export * from './fetch-custom-activity-tool';
export * from './full-board-data-tool/full-board-data-tool';
export * from './undo-action-tool/undo-action-tool';
export * from './get-board-items-page-tool';
export * from './get-board-schema-tool';
export * from './get-column-type-info/get-column-type-info-fetch-mode';
export * from './get-column-type-info/get-column-type-info-tool';
export * from './get-graphql-schema-tool';
export * from './get-type-details-tool';
export * from './list-users-and-teams-tool/list-users-and-teams-tool';
export * from './manage-tools-tool';
export * from './move-item-to-group-tool';
export * from './read-docs-tool/read-docs-tool';
export * from './workspace-info-tool/workspace-info-tool';
export * from './list-workspace-tool/list-workspace-tool';
export * from './create-doc-tool/create-doc-tool';
export * from './add-content-to-doc-tool/add-content-to-doc-tool';
export * from './update-doc-tool/update-doc-tool';
export * from './get-board-activity/get-board-activity-tool';
export * from './get-board-info/get-board-info-tool';
export * from './update-workspace-tool/update-workspace-tool';
export * from './update-folder-tool/update-folder-tool';
export * from './create-workspace-tool/create-workspace-tool';
export * from './create-folder-tool/create-folder-tool';
export * from './move-object-tool/move-object-tool';
export * from './board-insights/board-insights-tool';
export * from './search-tool/search-tool';
export * from './user-context-tool/user-context-tool';
export * from './update-assets-on-item-tool/update-assets-on-item-tool';
export * from './get-assets-tool/get-assets-tool';
export * from './get-asset-upload-url-tool/get-asset-upload-url-tool';
export * from './finalize-asset-upload-tool/finalize-asset-upload-tool';
export * from './fetch-file-content-tool/fetch-file-content-tool';
// monday Platform Agents
export * from './agents-tools';
// Automations
export * from './automations-tools';
// Workflow Builder Tools
export * from './workflow-builder-tools/create-workflow/create-workflow-tool';
export * from './workflow-builder-tools/update-workflow/update-workflow-tool';
export * from './workflow-builder-tools/plan-workflow/plan-workflow-tool';
export * from './workflow-builder-tools/publish-workflow/publish-workflow-tool';
// Dashboard Tools
export * from './dashboard-tools';
// AI Column Tools
export * from './configure-ai-column-tool/configure-ai-column-tool';
export * from './remove-ai-from-column-tool/remove-ai-from-column-tool';
export * from './send-feedback-tool/send-feedback-tool';
export * from './get-monday-knowledge/get-monday-knowledge';
// Monday Dev Tools
export * from '../monday-dev-tools';
