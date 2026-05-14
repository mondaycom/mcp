import { z } from 'zod';
import {
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { addSkillToAgentMutation, removeSkillFromAgentMutation } from './manage-agent-skills.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentSkillsToolSchema = {
  action: z
    .enum(['add', 'remove'])
    .describe('"add" attaches an existing skill to an agent. "remove" detaches a skill from an agent.'),
  agent_id: z.string().trim().min(1).describe('Unique identifier of the agent.'),
  skill_id: z
    .string()
    .trim()
    .min(1)
    .describe(
      'The skill ID from get_agent_catalog (type:skills) or the id returned by create_agent_skill. Never guess or invent a skill ID.',
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
    return `Attach or detach a skill on a monday platform agent.

To create a brand-new skill, use create_agent_skill first, then call this tool with the returned id.
To find an existing skill id, call get_agent_catalog with type:"skills".

NOTE: There is no list action for skills — the platform does not yet expose a query for listing an agent's attached skills.

USAGE EXAMPLES:
- Add skill: { "action": "add", "agent_id": "7", "skill_id": "skill-abc-123" }
- Remove skill: { "action": "remove", "agent_id": "7", "skill_id": "skill-abc-123" }`;
  }

  getInputSchema() {
    return manageAgentSkillsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentSkillsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'add') {
      try {
        const variables: AddSkillToAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
        const res = await this.mondayApi.request<AddSkillToAgentMutation>(addSkillToAgentMutation, variables, {
          versionOverride: 'dev',
        });
        return { content: { message: 'Skill added to agent.', success: res.add_skill_to_agent?.success ?? false } };
      } catch (error) {
        rethrowWithContext(error, 'add skill to monday platform agent');
      }
    } else {
      try {
        const variables: RemoveSkillFromAgentMutationVariables = { agent_id: input.agent_id, skill_id: input.skill_id };
        const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(removeSkillFromAgentMutation, variables, {
          versionOverride: 'dev',
        });
        return {
          content: { message: 'Skill removed from agent.', success: res.remove_skill_from_agent?.success ?? false },
        };
      } catch (error) {
        rethrowWithContext(error, 'remove skill from monday platform agent');
      }
    }
  }
}
