import { BaseMondayApiToolConstructor } from '../platform-api-tools/base-monday-api-tool';
import { GetSprintSummaryTool } from './get-sprint-summary-tool/get-sprint-summary-tool';
import { GetSprintsMetadataTool } from './get-sprints-metadata-tool/get-sprints-metadata-tool';

export const allMondayDevTools: BaseMondayApiToolConstructor[] = [GetSprintsMetadataTool, GetSprintSummaryTool];

export * from './get-sprint-summary-tool/get-sprint-summary-tool';
export * from './get-sprints-metadata-tool/get-sprints-metadata-tool';
export * from './shared';
