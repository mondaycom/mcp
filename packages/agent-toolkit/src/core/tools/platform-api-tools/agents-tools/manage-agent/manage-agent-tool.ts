import { z } from 'zod';
import {
  ActivateAgentMutation,
  ActivateAgentMutationVariables,
  AgentModel,
  CreateAgentMutation,
  CreateAgentMutationVariables,
  CreateBlankAgentMutation,
  CreateBlankAgentMutationVariables,
  DeactivateAgentMutation,
  DeactivateAgentMutationVariables,
  DeleteAgentMutation,
  DeleteAgentMutationVariables,
  GetAgentsQuery,
  GetAgentsQueryVariables,
  InactiveReason,
  RunAgentMutation,
  RunAgentMutationVariables,
  UpdateAgentInput,
  UpdateAgentMutation,
  UpdateAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  activateAgentMutation,
  createAgentMutation,
  createBlankAgentMutation,
  deactivateAgentMutation,
  deleteAgentMutation,
  getAgentsQuery,
  runAgentMutation,
  updateAgentMutation,
} from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

const MANUAL_CREATE_FIELDS = ['name', 'role', 'role_description', 'avatar_url', 'gender', 'background_color', 'user_prompt'] as const;

export const manageAgentToolSchema = {
  action: z
    .enum(['create', 'get', 'update', 'delete', 'activate', 'deactivate', 'run'])
    .describe(
      '"create" — create a new agent (AI mode: pass "prompt" / manual mode: pass name/role/etc). "get" — fetch agents by id or list owned agents. "update" — modify mutable fields on an existing agent. "delete" — permanently delete an agent (irreversible). "activate" — transition agent to ACTIVE. "deactivate" — transition agent to INACTIVE. "run" — manually enqueue an agent run (fire-and-forget).',
    ),
  id: z
    .string()
    .trim()
    .min(1, 'Agent id must be a non-empty string')
    .optional()
    .describe(
      'Used with action:"get" to fetch a specific agent. Used with action:"update", "delete", "activate", "deactivate", "run" as the target agent. Omit for action:"create" or action:"get" (to list owned agents).',
    ),
  // create — AI mode
  prompt: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Used with action:"create" (AI mode). Plain-language description of what the agent should do. Platform uses this to generate profile, goal, and plan via AI. Be specific about domain and tasks.',
    ),
  agent_model: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Used with action:"create" (AI mode) or action:"update". STRONGLY DISCOURAGED — omit unless the user explicitly names a monday-supported model. Do not invent or guess model identifiers. Invalid values are rejected by the platform.',
    ),
  // create — manual mode
  name: z.string().trim().min(1).optional().describe('Used with action:"create" (manual mode). Display name of the agent.'),
  role: z.string().trim().min(1).optional().describe('Used with action:"create" (manual mode). Short role title (e.g. "Customer Success Bot").'),
  role_description: z.string().trim().min(1).optional().describe('Used with action:"create" (manual mode). Detailed description of the agent role.'),
  avatar_url: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Used with action:"create" (manual mode). HTTPS URL of the avatar. Prefer dapulse-res.cloudinary.com or cdn.monday.com.'),
  gender: z
    .enum(['male', 'female'])
    .optional()
    .describe('Used with action:"create" (manual mode). Hint for generated avatar/name when profile fields are omitted.'),
  background_color: z.string().trim().min(1).optional().describe('Used with action:"create" (manual mode). Lowercase hex, e.g. "#9450fd".'),
  user_prompt: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Used with action:"create" (manual mode). Stored as metadata. Not used for AI generation.'),
  // update
  plan: z.string().trim().min(1).optional().describe('Used with action:"update". New step-by-step execution plan in markdown.'),
  // deactivate
  inactive_reason: z
    .enum(['DEACTIVATED_BY_USER', 'ACCOUNT_LEVEL_BLOCKING'])
    .optional()
    .describe('Used with action:"deactivate". Reason recorded on the agent. Defaults to DEACTIVATED_BY_USER when omitted.'),
};

export class ManageAgentTool extends BaseMondayApiTool<typeof manageAgentToolSchema> {
  name = 'manage_agent';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Lifecycle and runtime-state management for monday platform agents. Combines create, get, update, delete, activate, deactivate, and run into one tool — pick the operation via "action".

monday platform agents are user-built work orchestrators on the monday.com platform — each has a profile (name, role, avatar), a goal, and a markdown execution plan. Agents in state ACTIVE can be triggered automatically. They are NOT local LangChain or MCP agents.

ACTIONS AND ARGS (only provide fields that apply to the chosen action):
- create (AI mode):     { action:"create", prompt, agent_model? }
- create (manual mode): { action:"create", name?, role?, role_description?, avatar_url?, gender?, background_color?, user_prompt? }
- get one:              { action:"get", id }
- list owned:           { action:"get" }
- update:               { action:"update", id, name?, role?, role_description?, plan?, agent_model? }
- delete:               { action:"delete", id }
- activate:             { action:"activate", id }
- deactivate:           { action:"deactivate", id, inactive_reason? }
- run:                  { action:"run", id }

RULES:
- "create" requires either "prompt" (AI mode) or at least one manual profile field. Do not mix both.
- "update" requires at least one of name/role/role_description/plan/agent_model.
- "update", "delete", "activate", "deactivate", "run" all require "id".
- Created agents start INACTIVE. Follow with action:"activate" and the returned id before they can be triggered.
- VERIFY BEFORE DELETING: when the user refers to an agent by name, call action:"get" first to confirm the correct id.
- "run" is fire-and-forget. Returns trigger_uuid (no run-status query exists) — treat enqueue as the only success signal.
- Agent state from action:"get" is one of ACTIVE, INACTIVE, ARCHIVED, or FAILED. DELETED only appears as the return value of action:"delete". Agent kind is one of PERSONAL, ACCOUNT_LEVEL, or EXTERNAL.

USAGE EXAMPLES:
- AI-generated: { "action": "create", "prompt": "Run my daily standup every weekday at 9am." }
- Manual:       { "action": "create", "name": "Standup Bot", "role": "Project Manager", "gender": "female" }
- Fetch one:    { "action": "get", "id": "42" }
- List mine:    { "action": "get" }
- Rename:       { "action": "update", "id": "7", "name": "New Name" }
- Activate:     { "action": "activate", "id": "7" }
- Deactivate:   { "action": "deactivate", "id": "7" }
- Run:          { "action": "run", "id": "7" }
- Delete:       { "action": "delete", "id": "7" }`;
  }

  getInputSchema() {
    return manageAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'create':
        return this.handleCreate(input);
      case 'get':
        return this.handleGet(input);
      case 'update':
        return this.handleUpdate(input);
      case 'delete':
        return this.handleDelete(input);
      case 'activate':
        return this.handleActivate(input);
      case 'deactivate':
        return this.handleDeactivate(input);
      case 'run':
        return this.handleRun(input);
    }
  }

  private async handleCreate(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    const hasPrompt = input.prompt !== undefined;
    const hasManualFields = MANUAL_CREATE_FIELDS.some((field) => input[field] !== undefined);

    if (hasPrompt && hasManualFields) {
      throw new Error('manage_agent action:"create" accepts either AI mode ("prompt") or manual mode (name/role/...). Do not mix both.');
    }
    if (!hasPrompt && input.agent_model !== undefined) {
      throw new Error('manage_agent action:"create" — "agent_model" can only be used together with "prompt".');
    }

    if (hasPrompt) {
      try {
        const variables: CreateAgentMutationVariables = { input: { prompt: input.prompt as string, agent_model: input.agent_model } };
        const res = await this.mondayApi.request<CreateAgentMutation>(createAgentMutation, variables, { versionOverride: 'dev' });
        if (!res.create_agent?.id) {
          throw new Error('monday platform agent creation returned no id');
        }
        return {
          content: {
            message: `monday platform agent ${res.create_agent.id} created in state INACTIVE — call manage_agent with action:"activate" and id:"${res.create_agent.id}" to activate it`,
            agent: res.create_agent,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'create monday platform agent');
      }
    }

    try {
      const blankInput: NonNullable<CreateBlankAgentMutationVariables['input']> = {};
      if (input.name !== undefined) blankInput.name = input.name;
      if (input.role !== undefined) blankInput.role = input.role;
      if (input.role_description !== undefined) blankInput.role_description = input.role_description;
      if (input.avatar_url !== undefined) blankInput.avatar_url = input.avatar_url;
      if (input.gender !== undefined) blankInput.gender = input.gender;
      if (input.background_color !== undefined) blankInput.background_color = input.background_color;
      if (input.user_prompt !== undefined) blankInput.user_prompt = input.user_prompt;

      const variables: CreateBlankAgentMutationVariables = { input: blankInput };
      const res = await this.mondayApi.request<CreateBlankAgentMutation>(createBlankAgentMutation, variables, { versionOverride: 'dev' });
      if (!res.create_blank_agent?.id) {
        throw new Error('monday platform agent creation returned no id');
      }
      return {
        content: {
          message: `monday platform agent ${res.create_blank_agent.id} created in state INACTIVE — call manage_agent with action:"activate" and id:"${res.create_blank_agent.id}" to activate it`,
          agent: res.create_blank_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create blank monday platform agent');
    }
  }

  private async handleGet(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (input.id !== undefined) {
      try {
        const { agents } = await this.mondayApi.request<GetAgentsQuery>(
          getAgentsQuery,
          { ids: [input.id] } satisfies GetAgentsQueryVariables,
          { versionOverride: 'dev' },
        );
        const agent = agents?.[0];
        if (!agent) {
          return { content: `monday platform agent ${input.id} not found, or the authenticated user does not have access to it.` };
        }
        return { content: { message: 'monday platform agent', agent } };
      } catch (error) {
        rethrowWithContext(error, 'get monday platform agent');
      }
    }

    try {
      const { agents } = await this.mondayApi.request<GetAgentsQuery>(
        getAgentsQuery,
        { limit: 100 } satisfies GetAgentsQueryVariables,
        { versionOverride: 'dev' },
      );
      const list = agents ?? [];
      return {
        content: {
          message: 'monday platform agents owned by the authenticated user (limited to 100 — ask the user if they need more)',
          count: list.length,
          agents: list,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list monday platform agents');
    }
  }

  private async handleUpdate(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.id) {
      throw new Error('manage_agent action:"update" requires "id".');
    }
    try {
      const agentInput: UpdateAgentInput = {};
      if (input.name !== undefined) agentInput.name = input.name;
      if (input.role !== undefined) agentInput.role = input.role;
      if (input.role_description !== undefined) agentInput.role_description = input.role_description;
      if (input.plan !== undefined) agentInput.plan = input.plan;
      if (input.agent_model !== undefined) agentInput.agent_model = input.agent_model as AgentModel;

      if (Object.keys(agentInput).length === 0) {
        throw new Error('manage_agent action:"update" requires at least one of: name, role, role_description, plan, agent_model.');
      }

      const variables: UpdateAgentMutationVariables = { id: input.id, input: agentInput };
      const res = await this.mondayApi.request<UpdateAgentMutation>(updateAgentMutation, variables, { versionOverride: 'dev' });
      if (!res.update_agent) {
        throw new Error('update_agent returned no data — the agent may not exist');
      }
      return { content: { message: 'monday platform agent updated', agent: res.update_agent } };
    } catch (error) {
      rethrowWithContext(error, 'update monday platform agent');
    }
  }

  private async handleDelete(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.id) {
      throw new Error('manage_agent action:"delete" requires "id".');
    }
    try {
      const variables: DeleteAgentMutationVariables = { id: input.id };
      const res = await this.mondayApi.request<DeleteAgentMutation>(deleteAgentMutation, variables, { versionOverride: 'dev' });
      if (!res.delete_agent?.id) {
        throw new Error('monday platform agent delete returned no id');
      }
      return { content: { message: `monday platform agent ${res.delete_agent.id} deleted`, agent: res.delete_agent } };
    } catch (error) {
      rethrowWithContext(error, 'delete monday platform agent');
    }
  }

  private async handleActivate(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.id) {
      throw new Error('manage_agent action:"activate" requires "id".');
    }
    try {
      const res = await this.mondayApi.request<ActivateAgentMutation>(
        activateAgentMutation,
        { id: input.id } satisfies ActivateAgentMutationVariables,
        { versionOverride: 'dev' },
      );
      return { content: { message: 'Agent activated.', success: res.activate_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'activate monday platform agent');
    }
  }

  private async handleDeactivate(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.id) {
      throw new Error('manage_agent action:"deactivate" requires "id".');
    }
    const reason = input.inactive_reason === 'ACCOUNT_LEVEL_BLOCKING' ? InactiveReason.AccountLevelBlocking : InactiveReason.DeactivatedByUser;
    try {
      const variables: DeactivateAgentMutationVariables = { id: input.id, inactive_reason: reason };
      const res = await this.mondayApi.request<DeactivateAgentMutation>(deactivateAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Agent deactivated.', success: res.deactivate_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'deactivate monday platform agent');
    }
  }

  private async handleRun(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.id) {
      throw new Error('manage_agent action:"run" requires "id".');
    }
    try {
      const res = await this.mondayApi.request<RunAgentMutation>(
        runAgentMutation,
        { id: input.id } satisfies RunAgentMutationVariables,
        { versionOverride: 'dev' },
      );
      if (!res.run_agent) {
        throw new Error('run_agent returned no data — the agent run may not have been enqueued');
      }
      return { content: { message: 'Agent run enqueued.', trigger_uuid: res.run_agent.trigger_uuid } };
    } catch (error) {
      rethrowWithContext(error, 'run monday platform agent');
    }
  }
}
