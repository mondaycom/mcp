import { BaseMondayApiToolConstructor } from '../platform-api-tools/base-monday-api-tool';
import { GetSprintSummaryTool } from './get-sprint-summary-tool/get-sprint-summary-tool';
import { GetSprintsMetadataTool } from './get-sprints-metadata-tool/get-sprints-metadata-tool';
import { GetSprintsBoardsTool } from './get-sprints-boards-tool/get-sprints-boards-tool';

export const allMondayDevTools: BaseMondayApiToolConstructor[] = [
  GetSprintsBoardsTool,
  GetSprintsMetadataTool,
  GetSprintSummaryTool,
];

export * from './get-sprint-summary-tool/get-sprint-summary-tool';
export * from './get-sprints-metadata-tool/get-sprints-metadata-tool';
export * from './get-sprints-boards-tool/get-sprints-boards-tool';
