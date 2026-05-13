import { z } from 'zod';
import {
  CreateAgentSkillMutation,
  CreateAgentSkillMutationVariables,
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  createAgentSkillMutation,
  addSkillToAgentMutation,
  removeSkillFromAgentMutation,
} from './manage-agent-skills.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentSkillsToolSchema = {
  action: z
    .enum(['create', 'add', 'remove'])
    .describe('"create" makes a new custom skill in the account catalog. "add" attaches an existing skill to an agent. "remove" detaches a skill from an agent.'),
  // create only
  name: z.string().trim().min(1).optional().describe('Required for action:create. Display name of the new skill.'),
  content: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:create. Markdown instructions defining what the skill does and how to execute it.'),
  description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Optional for action:create. Short description of the skill shown in the catalog.'),
  // add, remove only
  agent_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:add and action:remove. Unique identifier of the agent.'),
  skill_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Required for action:add and action:remove. The skill ID from get_agent_catalog (type:skills) or the id returned by action:create. Never guess or invent a skill ID.',
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
    return `Create, add, or remove skills for a monday platform agent.

Skills extend what an agent can do — for example, sending emails, searching the web, or querying databases.

WORKFLOW FOR CREATE:
1. Call this tool with action:"create", providing a name and markdown content (instructions).
2. Note the id in the response — use it as skill_id for action:"add".

WORKFLOW FOR ADD:
1. Call get_agent_catalog with type:"skills" to find an existing skill by name/description, or use the id returned by action:"create".
2. Call this tool with action:"add" and the resolved skill_id.

WORKFLOW FOR REMOVE:
1. Call this tool with action:"remove" and the skill_id to detach.

NOTE: There is no list action for skills — the platform does not yet expose a query for listing an agent's attached skills.

USAGE EXAMPLES:
- Create skill: { "action": "create", "name": "Send Slack Message", "content": "## Instructions\\nPost a message to Slack." }
- Add skill: { "action": "add", "agent_id": "7", "skill_id": "skill-abc-123" }
- Remove skill: { "action": "remove", "agent_id": "7", "skill_id": "skill-abc-123" }`;
  }

  getInputSchema() {
    return manageAgentSkillsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentSkillsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'create') {
      if (!input.name || !input.content) {
        throw new Error('name and content are required for action:create');
      }
      try {
        const variables: CreateAgentSkillMutationVariables = {
          name: input.name,
          content: input.content,
          description: input.description,
        };
        const res = await this.mondayApi.request<CreateAgentSkillMutation>(
          createAgentSkillMutation,
          variables,
          { versionOverride: 'dev' },
        );
        if (!res.create_agent_skill) {
          throw new Error('create_agent_skill returned no data');
        }
        return {
          content: {
            message: 'Skill created. Use the returned id with action:add to attach it to an agent.',
            skill: res.create_agent_skill,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'create monday platform agent skill');
      }
    }

    if (!input.agent_id || !input.skill_id) {
      throw new Error('agent_id and skill_id are required for action:add and action:remove');
    }

    if (input.action === 'add') {
      try {
        const variables: AddSkillToAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
        const res = await this.mondayApi.request<AddSkillToAgentMutation>(
          addSkillToAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return { content: { message: 'Skill added to agent.', success: res.add_skill_to_agent?.success ?? false } };
      } catch (error) {
        rethrowWithContext(error, 'add skill to monday platform agent');
      }
    } else {
      try {
        const variables: RemoveSkillFromAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
        const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(
          removeSkillFromAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return { content: { message: 'Skill removed from agent.', success: res.remove_skill_from_agent?.success ?? false } };
      } catch (error) {
        rethrowWithContext(error, 'remove skill from monday platform agent');
      }
    }
  }
}
