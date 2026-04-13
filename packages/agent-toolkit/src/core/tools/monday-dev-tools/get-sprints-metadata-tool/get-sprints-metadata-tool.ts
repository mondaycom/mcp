import { z } from 'zod';
import {
  Column,
  GetSprintsBoardItemsWithColumnsQuery,
  GetSprintsBoardItemsWithColumnsQueryVariables,
  GetBoardSchemaQuery,
  GetBoardSchemaQueryVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { getBoardSchema } from '../../../../monday-graphql/queries.graphql';
import { getSprintsBoardItemsWithColumns } from './get-sprints-metadata-tool.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../platform-api-tools/base-monday-api-tool';
import {
  ALL_SPRINT_COLUMNS,
  getCheckboxValue,
  getDateValue,
  getTimelineValue,
  getDocValue,
  SPRINT_STATUS,
  ERROR_PREFIXES,
  Sprint,
  REQUIRED_SPRINT_COLUMNS,
  validateItemColumns,
  getSprintColumnDisplayName,
  SPRINT_COLUMN_DISPLAY_NAMES,
} from '../shared';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export const getSprintsMetadataToolSchema = {
  sprintsBoardId: z.number().describe('The ID of the monday-dev board containing the sprints'),
  limit: z
    .number()
    .min(MIN_LIMIT)
    .max(MAX_LIMIT)
    .optional()
    .default(DEFAULT_LIMIT)
    .describe(`The number of sprints to retrieve (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})`),
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
A table of sprints with the following information:
- Sprint ID
- Sprint Name
- Sprint timeline (planned from/to dates)
- Sprint completion status (completed/in-progress/planned)
- Sprint start date (actual)
- Sprint end date (actual)
- Sprint activation status
- Sprint summary document object ID

## Parameters:
- **limit**: Number of sprints to retrieve (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})

Requires the Main Sprints board ID of the monday-dev containing your sprints.`;
  }

  getInputSchema(): typeof getSprintsMetadataToolSchema {
    return getSprintsMetadataToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getSprintsMetadataToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      // Step 1: Validate board schema first using board schema API
      const schemaValidation = await this.validateBoardSchema(input.sprintsBoardId.toString());
      if (!schemaValidation.success) {
        return {
          content: schemaValidation.error || 'Board schema validation failed',
        };
      }

      // Step 2: Fetch sprint items from the board
      const variables: GetSprintsBoardItemsWithColumnsQueryVariables = {
        boardId: input.sprintsBoardId.toString(),
        limit: input.limit,
      };

      const res = await this.mondayApi.request<GetSprintsBoardItemsWithColumnsQuery>(
        getSprintsBoardItemsWithColumns,
        variables,
      );

      const board = res.boards?.[0];
      const sprints = board?.items_page?.items || [];

      // Step 3: Build structured sprints metadata
      const sprintsData = this.buildSprintsMetadata(sprints);

      return {
        content: {
          message: 'Sprints metadata retrieved',
          board_id: input.sprintsBoardId,
          total: sprints.length,
          data: sprintsData,
        },
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
  private async validateBoardSchema(boardId: string) {
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
      const schemaValidation = this.validateSprintsBoardSchemaFromColumns(columns as Column[]);

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

  private validateSprintsBoardSchemaFromColumns(boardColumns: Column[]): { isValid: boolean; errorMessage: string } {
    const existingColumnIds = new Set(
      boardColumns.filter((col): col is NonNullable<Column> => col !== null).map((col) => col.id),
    );

    const requiredColumns = Object.values(REQUIRED_SPRINT_COLUMNS);
    const validation = validateItemColumns(existingColumnIds, requiredColumns);

    if (!validation.isValid) {
      let errorMessage = `BoardID provided is not a valid sprints board. Missing required columns:\n\n`;

      validation.missingColumns.forEach((columnId) => {
        const columnDisplayName = getSprintColumnDisplayName(columnId as keyof typeof SPRINT_COLUMN_DISPLAY_NAMES);
        errorMessage += `- ${columnDisplayName}\n`;
      });

      return { isValid: false, errorMessage };
    }

    return { isValid: true, errorMessage: '' };
  }

  private buildSprintsMetadata(sprints: Sprint[]): Array<Record<string, unknown>> {
    return sprints.map((sprint) => {
      const isActivated = getCheckboxValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_ACTIVATION);
      const isCompleted = getCheckboxValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_COMPLETION);
      const startDate = getDateValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_START_DATE);
      const endDate = getDateValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_END_DATE);
      const timeline = getTimelineValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_TIMELINE);
      const documentObjectId = getDocValue(sprint, ALL_SPRINT_COLUMNS.SPRINT_SUMMARY);

      let status: string = SPRINT_STATUS.Planned;
      if (isCompleted) {
        status = SPRINT_STATUS.Completed;
      } else if (isActivated || startDate) {
        status = SPRINT_STATUS.Active;
      }

      return {
        id: sprint.id,
        name: sprint.name || 'Unknown',
        status,
        timeline: timeline ? { from: timeline.from, to: timeline.to } : null,
        start_date: startDate || null,
        end_date: endDate || null,
        is_completed: isCompleted,
        document_object_id: documentObjectId || null,
      };
    });
  }
}
