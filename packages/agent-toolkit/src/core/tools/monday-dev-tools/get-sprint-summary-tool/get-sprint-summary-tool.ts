import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../platform-api-tools/base-monday-api-tool';
import {
  GetSprintsByIdsQuery,
  GetSprintsByIdsQueryVariables,
  ReadDocsQuery,
  ReadDocsQueryVariables,
  ExportMarkdownFromDocQuery,
  ExportMarkdownFromDocQueryVariables,
} from '../../../../monday-graphql/generated/graphql';
import {
  readDocs as readSprintSummaryDocs,
  exportMarkdownFromDoc as exportSprintSummaryMarkdown,
} from '../../../../monday-graphql/queries.graphql';
import { getSprintsByIds } from './get-sprint-summary-tool.graphql';
import {
  ERROR_PREFIXES,
  ALL_SPRINT_COLUMNS,
  DOCS_LIMIT,
  getDocValue,
  Sprint,
  validateSprintItemColumns,
} from '../shared';

export const getSprintSummaryToolSchema = {
  sprintId: z.number().describe('The ID of the sprint to get the summary for (e.g., "9123456789")'),
};

export class GetSprintSummaryTool extends BaseMondayApiTool<typeof getSprintSummaryToolSchema> {
  name = 'get_sprint_summary';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'monday-dev: Get Sprint Summary',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get the complete summary and analysis of a sprint.

## Purpose:
Unlock deep insights into completed sprint performance. 

The sprint summary content including:
- **Scope Management**: Analysis of planned vs. unplanned tasks, scope creep
- **Velocity & Performance**: Individual velocity, task completion rates, workload distribution per team member
- **Task Distribution**: Breakdown of completed tasks by type (Feature, Bug, Tech Debt, Infrastructure, etc.)
- **AI Recommendations**: Action items, process improvements, retrospective focus areas

## Requirements:
- Sprint must be completed and must be created after 1/1/2025 

## Important Note:
When viewing the section "Completed by Assignee", you'll see user IDs in the format "@user-12345678". the 8 digits after the @is the user ID. To retrieve the actual owner names, use the list_users_and_teams tool with the user ID and set includeTeams=false for optimal performance.

`;
  }

  getInputSchema(): typeof getSprintSummaryToolSchema {
    return getSprintSummaryToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getSprintSummaryToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      // Step 1: Get the sprint metadata to find the summary document object ID
      const sprintMetadata = await this.getSprintMetadata(input.sprintId);
      if (!sprintMetadata.success) {
        return {
          content:
            sprintMetadata.error ||
            `${ERROR_PREFIXES.INTERNAL_ERROR} Unknown error occurred while getting sprint metadata`,
        };
      }

      // Step 2: Read the document content using the object ID
      const documentContent = await this.readSprintSummaryDocument(sprintMetadata.documentObjectId!);
      if (!documentContent.success) {
        return {
          content:
            documentContent.error ||
            `${ERROR_PREFIXES.INTERNAL_ERROR} Unknown error occurred while reading document content`,
        };
      }

      return {
        content: documentContent.content!,
      };
    } catch (error) {
      return {
        content: `${ERROR_PREFIXES.INTERNAL_ERROR} Error retrieving sprint summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Gets sprint metadata and extracts the summary document object ID
   */
  private async getSprintMetadata(sprintId: number) {
    try {
      // Step 1: Fetch the specific sprint item by ID
      const variables: GetSprintsByIdsQueryVariables = {
        ids: [String(sprintId)],
      };

      const res = await this.mondayApi.request<GetSprintsByIdsQuery>(getSprintsByIds, variables);

      const sprints = res.items || [];

      if (sprints.length === 0) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.SPRINT_NOT_FOUND} Sprint with ID ${sprintId} not found. Please verify the sprint ID is correct.`,
        };
      }

      const sprint = sprints[0];
      if (!sprint) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.SPRINT_NOT_FOUND} Sprint with ID ${sprintId} not found.`,
        };
      }

      // Step 2: Validate sprint has required columns + summary column
      const validation = validateSprintItemColumns(sprint, [ALL_SPRINT_COLUMNS.SPRINT_SUMMARY]);

      if (!validation.isValid) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.VALIDATION_ERROR} Sprint item is missing required columns: ${validation.missingColumns.join(', ')}. This may not be a valid sprint board item.`,
        };
      }

      // Step 3: Extract sprint summary document object ID using helper
      const documentObjectId = getDocValue(sprint as Sprint, ALL_SPRINT_COLUMNS.SPRINT_SUMMARY);

      if (!documentObjectId) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.DOCUMENT_NOT_FOUND} No sprint summary document found for sprint "${sprint.name}" (ID: ${sprintId}). Sprint summary is only available for completed sprints that have analysis documents.`,
        };
      }

      return {
        success: true,
        documentObjectId,
        sprintName: sprint.name,
      };
    } catch (error) {
      return {
        success: false,
        error: `${ERROR_PREFIXES.INTERNAL_ERROR} Error getting sprint item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Reads the sprint summary document content
   */
  private async readSprintSummaryDocument(documentObjectId: string) {
    try {
      // Step 1: Fetch document metadata using object ID
      const readDocsVariables: ReadDocsQueryVariables = {
        object_ids: [documentObjectId],
        limit: DOCS_LIMIT,
      };

      const docsResponse = await this.mondayApi.request<ReadDocsQuery>(readSprintSummaryDocs, readDocsVariables);

      const docs = docsResponse.docs || [];
      if (docs.length === 0) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.DOCUMENT_NOT_FOUND} Document with object ID ${documentObjectId} not found or not accessible.`,
        };
      }

      const doc = docs[0];
      if (!doc || !doc.id) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.DOCUMENT_INVALID} Document data is invalid for object ID ${documentObjectId}.`,
        };
      }

      // Step 2: Export document content as markdown
      const exportVariables: ExportMarkdownFromDocQueryVariables = {
        docId: doc.id,
        blockIds: [], // Empty array to get all blocks
      };

      const exportResponse = await this.mondayApi.request<ExportMarkdownFromDocQuery>(
        exportSprintSummaryMarkdown,
        exportVariables,
      );

      if (!exportResponse.export_markdown_from_doc?.success) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.EXPORT_FAILED} Failed to export markdown from document: ${exportResponse.export_markdown_from_doc?.error || 'Unknown error'}`,
        };
      }

      const markdown = exportResponse.export_markdown_from_doc.markdown;
      if (!markdown) {
        return {
          success: false,
          error: `${ERROR_PREFIXES.DOCUMENT_EMPTY} Document content is empty or could not be retrieved.`,
        };
      }

      return {
        success: true,
        content: markdown,
      };
    } catch (error) {
      return {
        success: false,
        error: `${ERROR_PREFIXES.INTERNAL_ERROR} Error reading document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
