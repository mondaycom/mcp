import { z } from 'zod';
import { 
  Column,
  GetSprintsBoardItemsWithColumnsQuery, 
  GetSprintsBoardItemsWithColumnsQueryVariables,
  GetBoardSchemaQuery,
  GetBoardSchemaQueryVariables,
} from '../../../monday-graphql/generated/graphql';
import { getSprintsBoardItemsWithColumns, getBoardSchema } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../platform-api-tools/base-monday-api-tool';
import { 
  REQUIRED_SPRINT_COLUMNS, 
  validateSprintsBoardSchemaFromColumns, 
  getCheckboxValue,
  getDateValue,
  getTimelineValue,
  getDocValue,
  SPRINT_STATUS,
  ERROR_PREFIXES,
  Sprint
} from './shared';

export const getSprintsMetadataToolSchema = {
  sprintsBoardId: z.number().describe('The ID of the monday-dev board containing the sprints'),
};

export class GetSprintsMetadataTool extends BaseMondayApiTool<typeof getSprintsMetadataToolSchema> {
  name = 'get_sprints_metadata';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'monday-dev: Get Sprints Metadata',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get comprehensive sprint metadata from a monday-dev sprints board including:

## Data Retrieved:
A table of the last 25 sprints with the following information:
- Sprint ID
- Sprint Name
- Sprint timeline (planned from/to dates)
- Sprint completion status (completed/in-progress/planned)
- Sprint start date (actual)
- Sprint end date (actual)
- Sprint activation status
- Sprint summary document object ID

Requires the Main Sprints board ID of the monday-dev containing your sprints.`;
  }

  getInputSchema(): typeof getSprintsMetadataToolSchema {
    return getSprintsMetadataToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getSprintsMetadataToolSchema>): Promise<ToolOutputType<never>> {
    try {
      // Step 1: Validate board schema first using board schema API
      const schemaValidation = await this.validateBoardSchema(input.sprintsBoardId.toString());
      if (!schemaValidation.success) {
        return {
          content: schemaValidation.error || 'Board schema validation failed',
        };
      }

      // Step 2: Fetch all sprint items from the board
      const variables: GetSprintsBoardItemsWithColumnsQueryVariables = {
        boardId: input.sprintsBoardId.toString(),
      };

      const res = await this.mondayApi.request<GetSprintsBoardItemsWithColumnsQuery>(getSprintsBoardItemsWithColumns, variables);
      
      // Validate board exists
      const board = res.boards?.[0];
      if (!board) {
        return {
          content: `${ERROR_PREFIXES.BOARD_NOT_FOUND} Board with ID ${input.sprintsBoardId} not found. Please verify the board ID is correct and you have access to it.`,
        };
      }

      const sprints = board.items_page?.items || [];

      // Step 3: Generate comprehensive sprints metadata report
      const report = this.generateSprintsMetadataReport(sprints);
      
      return {
        content: report,
      };
    } catch (error) {
      return {
        content: `${ERROR_PREFIXES.INTERNAL_ERROR} Error retrieving sprints metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }     

  /**
   * Validates that the board has the required sprint columns using board schema API
   */
  private async validateBoardSchema(boardId: string){
    try {
      const variables: GetBoardSchemaQueryVariables = {
        boardId: boardId.toString(),
      };

      const res = await this.mondayApi.request<GetBoardSchemaQuery>(getBoardSchema, variables);
      
      const board = res.boards?.[0];
      if (!board) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.BOARD_NOT_FOUND} Board with ID ${boardId} not found. Please verify the board ID is correct and you have access to it.`,
        };
      }

      const columns = board.columns || [];
      const schemaValidation = validateSprintsBoardSchemaFromColumns(columns as Column[] );
      
      if (!schemaValidation.isValid) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.VALIDATION_ERROR} ${schemaValidation.errorMessage}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `${ERROR_PREFIXES.INTERNAL_ERROR} Error validating board schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private generateSprintsMetadataReport(sprints: Sprint[]): string {
    let report = `# Sprints Metadata Report\n\n`;
    report += `**Total Sprints:** ${sprints.length}\n\n`;
    report += `| Sprint Name | Sprint ID | Status | Timeline (Planned) | Start Date (Actual) | End Date (Actual) | Completion | Summary Document ObjectID |\n`;
    report += `|-------------|-----------|--------|--------------------|---------------------|-------------------|------------|---------------------------|w\n`;

    sprints.forEach((sprint) => {
      const sprintName = sprint.name || 'Unknown';
      const sprintId = sprint.id;
      
      // Get typed column values using helpers
      const isActivated = getCheckboxValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_ACTIVATION);
      const isCompleted = getCheckboxValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_COMPLETION);
      const startDate = getDateValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_START_DATE);
      const endDate = getDateValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_END_DATE);
      const timeline = getTimelineValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_TIMELINE);
      const documentObjectId = getDocValue(sprint, REQUIRED_SPRINT_COLUMNS.SPRINT_SUMMARY);

      // Determine status
      let status: string = SPRINT_STATUS.Planned;
      if (isCompleted) {
        status = SPRINT_STATUS.Completed;
      } else if (isActivated || startDate) {
        status = SPRINT_STATUS.Active;
      }

      // Format timeline
      const timelineText = timeline 
        ? `${timeline.from} to ${timeline.to}`
        : 'Not set';

      // Format dates
      const startDateText = startDate || 'Not started';
      const endDateText = endDate || 'Not ended';
      const completionText = isCompleted ? 'Yes' : 'No';
      const documentObjectIdText = documentObjectId || 'No document';

      report += `| ${sprintName} | ${sprintId} | ${status} | ${timelineText} | ${startDateText} | ${endDateText} | ${completionText} | ${documentObjectIdText} |\n`;
    });

    report += `\n## Status Definitions:\n`;
    report += `- **${SPRINT_STATUS.Planned}**: Sprint not yet started (no activation, no start date)\n`;
    report += `- **${SPRINT_STATUS.Active}**: Sprint is active (activated but not completed)\n`;
    report += `- **${SPRINT_STATUS.Completed}**: Sprint is finished\n\n`;


    return report;
  }
}

