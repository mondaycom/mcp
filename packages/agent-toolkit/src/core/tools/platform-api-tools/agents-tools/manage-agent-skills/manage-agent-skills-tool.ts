import { z } from 'zod';
import {
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  CreateAgentSkillMutation,
  CreateAgentSkillMutationVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { addSkillToAgentMutation, createAgentSkillMutation, removeSkillFromAgentMutation } from '../shared/agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentSkillsToolSchema = {
  action: z
    .enum(['create', 'add', 'remove'])
    .describe(
      '"create" — author a new custom skill in the account-wide catalog (no agent_id needed). "add" — attach an existing skill to this agent by skill_id. "remove" — detach a skill from this agent.',
    ),
  agent_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:"add" and action:"remove". Not used for action:"create" (account-level operation).'),
  name: z.string().trim().min(1).optional().describe('Required for action:"create". Display name of the new skill.'),
  content: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"create". Markdown instructions defining what the skill does and how to execute it. Be specific and thorough — this is the skill\'s runtime behavior.',
    ),
  description: z.string().trim().min(1).optional().describe('Used with action:"create". Short description shown in the catalog.'),
  skill_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:"add" and action:"remove". The skill id from agent_catalog action:"list_skills", or the id returned by action:"create" in this tool. Never guess or invent a skill id.',
    ),
};

export class ManageAgentSkillsTool extends BaseMondayApiTool<typeof manageAgentSkillsToolSchema> {
  name = 'manage_agent_skills';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Skills',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Manage the full skill lifecycle for monday platform agents — create new skills in the catalog, attach skills to an agent, or detach them.

Skills extend what an agent can do (e.g. sending emails, querying databases, posting to Slack).

ACTIONS:
- create: { name, content, description? } — creates a new custom skill in the account-wide catalog.
  The skill becomes available to all agents in the account.
- add:    { agent_id, skill_id } — attaches a skill to this agent.
- remove: { agent_id, skill_id } — detaches a skill from this agent.

WORKFLOW — attach an existing skill:
1. Call agent_catalog action:"list_skills" — find the skill_id of the skill to attach.
2. Call this tool action:"add" with agent_id and that skill_id.

WORKFLOW — create a new skill and attach it:
1. Call this tool action:"create" with name and content — note the returned id.
2. Call this tool action:"add" with agent_id and that id directly (no catalog lookup needed).

NOTE: There is no action to list which skills are currently attached to a specific agent — the platform does not yet expose that query.
To browse all skills available in the account catalog, use agent_catalog action:"list_skills".

USAGE EXAMPLES:
- Create a skill:  { "action": "create", "name": "Send Slack Message", "content": "## Instructions\\nPost a message to a Slack channel.", "description": "Sends a message to Slack" }
- Add a skill:     { "action": "add", "agent_id": "7", "skill_id": "skill-abc-123" }
- Remove a skill:  { "action": "remove", "agent_id": "7", "skill_id": "skill-abc-123" }

RELATED TOOLS:
- agent_catalog action:"list_skills" — browse existing skills to find a skill_id before calling action:"add"
- manage_agent_triggers — manage which triggers fire this agent automatically
- manage_agent — manage the agent entity itself (create, activate, deactivate, etc.)`;
  }

  getInputSchema() {
    return manageAgentSkillsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof manageAgentSkillsToolSchema>): Promise<ToolOutputType<never>> {
    switch (input.action) {
      case 'create':
        return this.handleCreate(input);
      case 'add':
        return this.handleAdd(input);
      case 'remove':
        return this.handleRemove(input);
    }
  }

  private async handleCreate(input: ToolInputType<typeof manageAgentSkillsToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.name || !input.content) {
      throw new Error('action:"create" requires both "name" and "content".');
    }
    try {
      const variables: CreateAgentSkillMutationVariables = {
        name: input.name,
        content: input.content,
        description: input.description,
      };
      const res = await this.mondayApi.request<CreateAgentSkillMutation>(createAgentSkillMutation, variables, { versionOverride: 'dev' });
      if (!res.create_agent_skill) {
        throw new Error('create_agent_skill returned no data');
      }
      return {
        content: {
          message: 'Skill created and added to the account catalog. Use the returned id with action:"add" to attach it to an agent.',
          skill: res.create_agent_skill,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent skill');
    }
  }

  private async handleAdd(input: ToolInputType<typeof manageAgentSkillsToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.agent_id) {
      throw new Error('agent_id is required for action:"add".');
    }
    if (!input.skill_id) {
      throw new Error('skill_id is required for action:"add". Get it from agent_catalog action:"list_skills" or from action:"create" in this tool.');
    }
    try {
      const variables: AddSkillToAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
      const res = await this.mondayApi.request<AddSkillToAgentMutation>(addSkillToAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Skill added to agent.', success: res.add_skill_to_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'add skill to monday platform agent');
    }
  }

  private async handleRemove(input: ToolInputType<typeof manageAgentSkillsToolSchema>): Promise<ToolOutputType<never>> {
    if (!input.agent_id) {
      throw new Error('agent_id is required for action:"remove".');
    }
    if (!input.skill_id) {
      throw new Error('skill_id is required for action:"remove".');
    }
    try {
      const variables: RemoveSkillFromAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
      const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(removeSkillFromAgentMutation, variables, { versionOverride: 'dev' });
      return { content: { message: 'Skill removed from agent.', success: res.remove_skill_from_agent?.success ?? false } };
    } catch (error) {
      rethrowWithContext(error, 'remove skill from monday platform agent');
    }
  }
}
