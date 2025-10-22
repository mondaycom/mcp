import { AllMondayApiTool } from './all-monday-api-tool';
import { BaseMondayApiToolConstructor } from './base-monday-api-tool';
import { ChangeItemColumnValuesTool } from './change-item-column-values-tool';
import { CreateBoardTool } from './create-board-tool';
import { CreateFormTool } from './workforms-tools/create-form-tool';
import { FormQuestionsEditorTool } from './workforms-tools/form-questions-editor-tool';
import { UpdateFormTool } from './workforms-tools/update-form-tool';
import { GetFormTool } from './workforms-tools/get-form-tool';
import { CreateColumnTool } from './create-column-tool';
import { CreateCustomActivityTool } from './create-custom-activity-tool';
import { CreateGroupTool } from './create-group/create-group-tool';
import { CreateItemTool } from './create-item-tool/create-item-tool';
import { CreateTimelineItemTool } from './create-timeline-item-tool';
import { CreateUpdateTool } from './create-update-tool';
import { DeleteColumnTool } from './delete-column-tool';
import { DeleteItemTool } from './delete-item-tool';
import { FetchCustomActivityTool } from './fetch-custom-activity-tool';
import { GetBoardActivityTool } from './get-board-activity/get-board-activity-tool';
import { GetBoardInfoTool } from './get-board-info/get-board-info-tool';
import { GetBoardItemsPageTool } from './get-board-items-page-tool/get-board-items-page-tool';
import { GetBoardSchemaTool } from './get-board-schema-tool';
import { GetColumnTypeInfoTool } from './get-column-type-info/get-column-type-info-tool';
import { GetGraphQLSchemaTool } from './get-graphql-schema-tool';
import { GetTypeDetailsTool } from './get-type-details-tool';
import { ListUsersAndTeamsTool } from './list-users-and-teams-tool/list-users-and-teams-tool';
import { MoveItemToGroupTool } from './move-item-to-group-tool';
import { ReadDocsTool } from './read-docs-tool';
import { WorkspaceInfoTool } from './workspace-info-tool/workspace-info-tool';
import { ListWorkspaceTool } from './list-workspace-tool/list-workspace-tool';
import { CreateDocTool } from './create-doc-tool/create-doc-tool';
import { CreateDashboardTool } from './dashboard-tools/create-dashboard-tool';
import { AllWidgetsSchemaTool } from './dashboard-tools/all-widgets-schema-tool';
import { CreateWidgetTool } from './dashboard-tools/create-widget-tool';
import { UpdateWorkspaceTool } from './update-workspace-tool/update-workspace-tool';
import { UpdateFolderTool } from './update-folder-tool/update-folder-tool';
import { CreateWorkspaceTool } from './create-workspace-tool/create-workspace-tool';
import { CreateFolderTool } from './create-folder-tool/create-folder-tool';
import { MoveObjectTool } from './move-object-tool/move-object-tool';
import { BoardInsightsTool } from './board-insights/board-insights-tool';

export const allGraphqlApiTools: BaseMondayApiToolConstructor[] = [
  DeleteItemTool,
  GetBoardItemsPageTool,
  CreateItemTool,
  CreateUpdateTool,
  GetBoardSchemaTool,
  GetBoardActivityTool,
  GetBoardInfoTool,
  ListUsersAndTeamsTool,
  ChangeItemColumnValuesTool,
  MoveItemToGroupTool,
  CreateBoardTool,
  CreateFormTool,
  UpdateFormTool,
  GetFormTool,
  FormQuestionsEditorTool,
  CreateColumnTool,
  CreateGroupTool,
  DeleteColumnTool,
  AllMondayApiTool,
  GetGraphQLSchemaTool,
  GetColumnTypeInfoTool,
  GetTypeDetailsTool,
  CreateCustomActivityTool,
  CreateTimelineItemTool,
  FetchCustomActivityTool,
  ReadDocsTool,
  WorkspaceInfoTool,
  ListWorkspaceTool,
  CreateDocTool,
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
];

export * from './all-monday-api-tool';
export * from './change-item-column-values-tool';
export * from './create-board-tool';
export * from './workforms-tools/create-form-tool';
export * from './workforms-tools/update-form-tool';
export * from './workforms-tools/get-form-tool';
export * from './workforms-tools/form-questions-editor-tool';
export * from './create-column-tool';
export * from './create-group/create-group-tool';
export * from './create-custom-activity-tool';
export * from './create-item-tool/create-item-tool';
export * from './create-timeline-item-tool';
export * from './create-update-tool';
export * from './delete-column-tool';
export * from './delete-item-tool';
export * from './fetch-custom-activity-tool';
export * from './get-board-items-page-tool/get-board-items-page-tool';
export * from './get-board-schema-tool';
export * from './get-column-type-info/get-column-type-info-tool';
export * from './get-graphql-schema-tool';
export * from './get-type-details-tool';
export * from './list-users-and-teams-tool/list-users-and-teams-tool';
export * from './manage-tools-tool';
export * from './move-item-to-group-tool';
export * from './read-docs-tool';
export * from './workspace-info-tool/workspace-info-tool';
export * from './list-workspace-tool/list-workspace-tool';
export * from './create-doc-tool/create-doc-tool';
export * from './get-board-activity/get-board-activity-tool';
export * from './get-board-info/get-board-info-tool';
export * from './update-workspace-tool/update-workspace-tool';
export * from './update-folder-tool/update-folder-tool';
export * from './create-workspace-tool/create-workspace-tool';
export * from './create-folder-tool/create-folder-tool';
export * from './move-object-tool/move-object-tool';
export * from './board-insights/board-insights-tool';
// Dashboard Tools
export * from './dashboard-tools';
// Monday Dev Tools
export * from '../monday-dev-tools';
