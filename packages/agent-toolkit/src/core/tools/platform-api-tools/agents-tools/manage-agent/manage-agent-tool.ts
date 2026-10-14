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
  GetCustomAgentsQuery,
  GetCustomAgentsQueryVariables,
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
  getCustomAgentsQuery,
  runAgentMutation,
  updateAgentMutation,
} from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentToolSchema = {
  action: z
    .enum(['create', 'create_blank', 'get', 'update', 'delete', 'activate', 'deactivate', 'run'])
    .describe(
      '"create" — create a new agent via AI (pass prompt). "create_blank" — create a new agent manually (pass name/role/etc). "get" — fetch one agent by agent_id or list owned agents. "update" — modify mutable fields on an existing agent. "delete" — permanently delete an agent (irreversible). "activate" — transition agent to ACTIVE. "deactivate" — transition agent to INACTIVE. "run" — manually enqueue an agent run (fire-and-forget).',
    ),
  agent_id: z
    .string()
    .trim()
    .min(1, 'agent_id must be a non-empty string')
    .optional()
    .describe(
      'Used with action:"get" to fetch a specific agent. Required for action:"update", "delete", "activate", "deactivate", "run". Omit for action:"create", "create_blank", or action:"get" (to list owned agents).',
    ),
  // create (AI mode)
  prompt: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:"create". Plain-language description of what the agent should do. Platform generates profile, goal, and plan via AI.'),
  agent_model: z
    .nativeEnum(AgentModel)
    .optional()
    .describe('Used with action:"create" or action:"update". Omit unless the user explicitly names a valid monday-supported model.'),
  // create_blank (manual mode)
  name: z.string().trim().min(1).optional().describe('Used with action:"create_blank" or action:"update". Display name of the agent.'),
  role: z.string().trim().min(1).optional().describe('Used with action:"create_blank" or action:"update". Short role title (e.g. "Customer Success Bot").'),
  role_description: z.string().trim().min(1).optional().describe('Used with action:"create_blank" or action:"update". Detailed description of the agent role.'),
  avatar_url: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Used with action:"create_blank". HTTPS URL of the avatar. Prefer dapulse-res.cloudinary.com or cdn.monday.com.'),
  gender: z.enum(['male', 'female']).optional().describe('Used with action:"create_blank". Hint for generated avatar/name when profile fields are omitted.'),
  background_color: z.string().trim().min(1).optional().describe('Used with action:"create_blank". Lowercase hex, e.g. "#9450fd".'),
  user_prompt: z.string().trim().min(1).optional().describe('Used with action:"create_blank". Stored as metadata. Not used for AI generation.'),
  // update
  plan: z.string().trim().min(1).optional().describe('Used with action:"update". New step-by-step execution plan in markdown.'),
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
    return `Full lifecycle management for monday platform agents — create, read, update, delete, change state, and run.

monday platform agents are user-built work orchestrators on monday.com — each has a profile (name, role, avatar), a goal, and a markdown execution plan. Agents in state ACTIVE can be triggered automatically. They are NOT local LangChain or MCP agents.

ACTIONS (only pass fields that apply to the chosen action):
- create:        { action:"create", prompt, agent_model? } — AI-generated agent. Platform creates profile, goal, and plan from the prompt.
- create_blank:  { action:"create_blank", name?, role?, role_description?, avatar_url?, gender?, background_color?, user_prompt? } — manually defined agent.
- get one:       { action:"get", agent_id }
- list owned:    { action:"get" }
- update:        { action:"update", agent_id, name?, role?, role_description?, plan?, agent_model? }
- delete:        { action:"delete", agent_id }
- activate:      { action:"activate", agent_id }
- deactivate:    { action:"deactivate", agent_id }
- run:           { action:"run", agent_id }

RULES:
- "create_blank" with no fields creates a nameless blank agent — only do this intentionally.
- "update" requires at least one of name/role/role_description/plan/agent_model.
- "update", "delete", "activate", "deactivate", "run" all require "agent_id".
- Created agents start INACTIVE. Follow with action:"activate" using the returned agent_id before they can be triggered.
- ⚠️ DESTRUCTIVE — "delete" is permanent and irreversible. When the user refers to an agent by name, ALWAYS call action:"get" first to confirm the correct agent_id before deleting.
- "run" is fire-and-forget. Returns trigger_uuid — no run-status query exists, treat successful enqueue as the only signal.
- Agent state is one of ACTIVE, INACTIVE, ARCHIVED, or FAILED. DELETED only appears as the return value of action:"delete".

USAGE EXAMPLES:
- AI create:    { "action": "create", "prompt": "Run my daily standup every weekday at 9am." }
- Manual create:{ "action": "create_blank", "name": "Standup Bot", "role": "Project Manager", "gender": "female" }
- Fetch one:    { "action": "get", "agent_id": "42" }
- List mine:    { "action": "get" }
- Rename:       { "action": "update", "agent_id": "7", "name": "New Name" }
- Activate:     { "action": "activate", "agent_id": "7" }
- Deactivate:   { "action": "deactivate", "agent_id": "7" }
- Run:          { "action": "run", "agent_id": "7" }
- Delete:       { "action": "delete", "agent_id": "7" }

RELATED TOOLS:
- agent_catalog — browse available trigger types and skills before wiring them to an agent
- manage_agent_triggers — manage which triggers fire this agent automatically
- manage_agent_skills — manage which skills this agent can perform
- manage_agent_knowledge — manage which boards/docs this agent has access to`;
  }

  getInputSchema() {
    return manageAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'create':
        return this.handleCreate(input);
      case 'create_blank':
        return this.handleCreateBlank(input);
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
    if (!input.prompt) {
      throw new Error('manage_agent action:"create" requires "prompt". For a manually configured agent, use action:"create_blank".');
    }
    try {
      const variables: CreateAgentMutationVariables = { input: { prompt: input.prompt, agent_model: input.agent_model } };
      const res = await this.mondayApi.request<CreateAgentMutation>(createAgentMutation, variables, { versionOverride: 'dev' });
      if (!res.create_agent?.id) {
        throw new Error('monday platform agent creation returned no id');
      }
      return {
        content: {
          message: `monday platform agent ${res.create_agent.id} created in state INACTIVE — call manage_agent with action:"activate" and agent_id:"${res.create_agent.id}" to activate it`,
          agent: res.create_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent');
    }
  }

  private async handleCreateBlank(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
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
          message: `monday platform agent ${res.create_blank_agent.id} created in state INACTIVE — call manage_agent with action:"activate" and agent_id:"${res.create_blank_agent.id}" to activate it`,
          agent: res.create_blank_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create blank monday platform agent');
    }
  }

  private async handleGet(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (input.agent_id !== undefined) {
      try {
        const { custom_agents } = await this.mondayApi.request<GetCustomAgentsQuery>(
          getCustomAgentsQuery,
          { ids: [input.agent_id] } satisfies GetCustomAgentsQueryVariables,
          { versionOverride: 'dev' },
        );
        const agent = custom_agents?.[0];
        if (!agent) {
          return { content: `monday platform agent ${input.agent_id} not found, or the authenticated user does not have access to it.` };
        }
        return { content: { message: 'monday platform agent', agent } };
      } catch (error) {
        rethrowWithContext(error, 'get monday platform agent');
      }
    }

    try {
      const { custom_agents } = await this.mondayApi.request<GetCustomAgentsQuery>(
        getCustomAgentsQuery,
        { limit: 100 } satisfies GetCustomAgentsQueryVariables,
        { versionOverride: 'dev' },
      );
      const list = custom_agents ?? [];
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
    if (!input.agent_id) {
      throw new Error('manage_agent action:"update" requires "agent_id".');
    }
    try {
      const agentInput: UpdateAgentInput = {};
      if (input.name !== undefined) agentInput.name = input.name;
      if (input.role !== undefined) agentInput.role = input.role;
      if (input.role_description !== undefined) agentInput.role_description = input.role_description;
      if (input.plan !== undefined) agentInput.plan = input.plan;
      if (input.agent_model !== undefined) agentInput.agent_model = input.agent_model;

      if (Object.keys(agentInput).length === 0) {
        throw new Error('manage_agent action:"update" requires at least one of: name, role, role_description, plan, agent_model.');
      }

      const variables: UpdateAgentMutationVariables = { id: input.agent_id, input: agentInput };
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
    if (!input.agent_id) {
      throw new Error('manage_agent action:"delete" requires "agent_id".');
    }
    try {
      const variables: DeleteAgentMutationVariables = { id: input.agent_id };
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
    if (!input.agent_id) {
      throw new Error('manage_agent action:"activate" requires "agent_id".');
    }
    try {
      const res = await this.mondayApi.request<ActivateAgentMutation>(
        activateAgentMutation,
        { id: input.agent_id } satisfies ActivateAgentMutationVariables,
        { versionOverride: 'dev' },
      );
      return { content: { message: 'Agent activated.', success: res.activate_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'activate monday platform agent');
    }
  }

  private async handleDeactivate(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.agent_id) {
      throw new Error('manage_agent action:"deactivate" requires "agent_id".');
    }
    try {
      const variables: DeactivateAgentMutationVariables = { id: input.agent_id, inactive_reason: InactiveReason.DeactivatedByUser };
      const res = await this.mondayApi.request<DeactivateAgentMutation>(deactivateAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Agent deactivated.', success: res.deactivate_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'deactivate monday platform agent');
    }
  }

  private async handleRun(input: ToolInputType<typeof manageAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.agent_id) {
      throw new Error('manage_agent action:"run" requires "agent_id".');
    }
    try {
      const res = await this.mondayApi.request<RunAgentMutation>(
        runAgentMutation,
        { id: input.agent_id } satisfies RunAgentMutationVariables,
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
