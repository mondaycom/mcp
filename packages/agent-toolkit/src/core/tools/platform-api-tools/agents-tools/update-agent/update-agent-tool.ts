import { z } from 'zod';
import {
  AgentModel,
  UpdateAgentMutation,
  UpdateAgentMutationVariables,
  UpdateAgentInput,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { updateAgentMutation } from './update-agent.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const updateAgentToolSchema = {
  id: z.string().trim().min(1).describe('Unique identifier of the agent to update'),
  name: z.string().trim().min(1).optional().describe('New display name for the agent'),
  role: z.string().trim().min(1).optional().describe('Short role title (e.g. "Customer Success Bot")'),
  role_description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Detailed description of the agent's role"),
  plan: z.string().trim().min(1).optional().describe('Step-by-step execution plan in markdown'),
  agent_model: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('AI model identifier. STRONGLY DISCOURAGED — omit this field. Only set when the user explicitly names a monday-supported model. Do not invent or guess model identifiers — use the exact string the user provided.'),
};

export class UpdateAgentTool extends BaseMondayApiTool<typeof updateAgentToolSchema> {
  name = 'update_agent';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Update monday Platform Agent',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Update an existing monday platform agent's profile or execution plan.

Only the fields you provide are changed — omit any field to leave it unchanged.

IMPORTANT — agent_model: Do not set agent_model unless the user has explicitly named a specific model. The platform selects a sensible default; setting an incorrect model degrades the agent's performance.

USAGE EXAMPLE:
- Update name only: { "id": "7", "name": "New Name" }
- Update plan: { "id": "7", "plan": "1. Check board status\\n2. Send notification" }`;
  }

  getInputSchema() {
    return updateAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof updateAgentToolSchema>): Promise<ToolOutputType<never>> {
    try {
      const agentInput: UpdateAgentInput = {};
      if (input.name !== undefined) agentInput.name = input.name;
      if (input.role !== undefined) agentInput.role = input.role;
      if (input.role_description !== undefined) agentInput.role_description = input.role_description;
      if (input.plan !== undefined) agentInput.plan = input.plan;
      if (input.agent_model !== undefined) agentInput.agent_model = input.agent_model as AgentModel;

      const variables: UpdateAgentMutationVariables = { id: input.id, input: agentInput };
      const res = await this.mondayApi.request<UpdateAgentMutation>(updateAgentMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.update_agent) {
        throw new Error('update_agent returned no data — the agent may not exist');
      }
      return { content: res.update_agent };
    } catch (error) {
      rethrowWithContext(error, 'update monday platform agent');
    }
  }
}
