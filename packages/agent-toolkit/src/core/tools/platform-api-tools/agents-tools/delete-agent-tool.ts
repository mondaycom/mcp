import { z } from 'zod';
import {
  DeleteAgentMutation,
  DeleteAgentMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { deleteAgentMutation } from './agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';

export const deleteAgentToolSchema = {
  id: z
    .string()
    .trim()
    .min(1, 'Agent id must be a non-empty string')
    .describe('Unique identifier of the monday platform agent to delete.'),
};

export class DeleteAgentTool extends BaseMondayApiTool<typeof deleteAgentToolSchema> {
  name = 'delete_agent';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Delete monday Platform Agent',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Permanently delete a personal/custom agent on the monday.com platform. Removes the agent and all of its versions. The agent stops appearing in get_agent results and can no longer be triggered. This action cannot be undone. Only the agent owner can delete it.

Terminology note: users might ask for "agent" in natural language (for example: "delete my standup agent"), but in this API context this refers to monday personal/custom agents.

VERIFY BEFORE DELETING: When the user refers to an agent by name or description (e.g. "delete my standup bot"), call get_agent (no id) first to list all the user's agents and confirm the correct id. Do not infer ids — pick the matching agent by inspecting profile.name / role / goal.

USAGE EXAMPLE:
{ "id": "42" }`;
  }

  getInputSchema() {
    return deleteAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof deleteAgentToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const variables: DeleteAgentMutationVariables = { id: input.id };

      const res = await this.mondayApi.request<DeleteAgentMutation>(deleteAgentMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.delete_agent?.id) {
        throw new Error('monday platform agent delete returned no id');
      }

      return {
        content: {
          message: `monday platform agent ${res.delete_agent.id} deleted`,
          agent: res.delete_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'delete monday platform agent');
    }
  }
}
