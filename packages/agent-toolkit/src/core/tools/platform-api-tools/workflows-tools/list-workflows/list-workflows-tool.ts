import { z } from 'zod';
import {
  GetLiveWorkflowsQuery,
  GetLiveWorkflowsQueryVariables,
  HostType,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { getLiveWorkflowsQuery } from '../shared/workflows.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const listWorkflowsToolSchema = {
  boardId: z
    .string()
    .trim()
    .min(1, 'boardId must be a non-empty string')
    .describe('Board ID whose live workflows should be listed. Pass the board (pulse) numeric ID as a string.'),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Maximum number of workflows to return (1-100). Defaults to the server limit when omitted.'),
  lastId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Cursor for pagination: pass the id of the last workflow from the previous page to fetch the next page.'),
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
    return `List the live automations/workflows on a monday.com board. Returns each workflow's id, title, description, active state, host data, block outline and variables JSON.

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
      const variables: GetLiveWorkflowsQueryVariables = {
        hostInstanceId: input.boardId,
        hostType: HostType.Board,
        pagination:
          input.limit != null || input.lastId != null
            ? { limit: input.limit, lastId: input.lastId }
            : undefined,
      };

      const res = await this.mondayApi.request<GetLiveWorkflowsQuery>(getLiveWorkflowsQuery, variables, {
        versionOverride: 'dev',
      });

      const workflows = res.get_live_workflows ?? [];

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
