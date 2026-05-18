import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';
import {
  getBoardAutomationsQuery,
  GetBoardAutomationsQuery,
  GetBoardAutomationsQueryVariables,
} from '../shared/board-automations';

export const listWorkflowsToolSchema = {
  boardId: z
    .string()
    .trim()
    .min(1, 'boardId must be a non-empty string')
    .describe('Board ID whose live workflows should be listed. Pass the board (pulse) numeric ID as a string.'),
};

export class ListWorkflowsTool extends BaseMondayApiTool<typeof listWorkflowsToolSchema> {
  name = 'list_workflows';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Live Workflows',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `List the live automations/workflows on a monday.com board. Returns each workflow's id, creator user_id, active state, title, description, created_at/updated_at timestamps, workflow_host_data, workflow_blocks, workflow_variables, importance, notice_message and template_reference_id.

Terminology note: users typically call these "automations" or "recipes" in the monday UI. In this API they are "workflows". Both terms refer to the same entity.

USAGE EXAMPLE:
{ "boardId": "1234567890" }`;
  }

  getInputSchema() {
    return listWorkflowsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listWorkflowsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: GetBoardAutomationsQueryVariables = {
        boardIds: [input.boardId],
      };

      const res = await this.mondayApi.request<GetBoardAutomationsQuery>(getBoardAutomationsQuery, variables, {
        versionOverride: '2026-10',
      });

      const workflows = res.board_automations?.items ?? [];

      return {
        content: {
          message: `Found ${workflows.length} live workflow(s) on board ${input.boardId}`,
          workflows,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list live workflows');
    }
  }
}
