import { z } from 'zod';
import {
  AddSkillToAgentMutation,
  AddSkillToAgentMutationVariables,
  RemoveSkillFromAgentMutation,
  RemoveSkillFromAgentMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  addSkillToAgentMutation,
  removeSkillFromAgentMutation,
} from './manage-agent-skills.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentSkillsToolSchema = {
  action: z
    .enum(['add', 'remove'])
    .describe('"add" attaches a skill. "remove" detaches a skill.'),
  agent_id: z.string().describe('Unique identifier of the agent'),
  skill_id: z
    .string()
    .describe(
      'The skill ID from get_agent_catalog (type:skills). Never guess — look it up.',
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
    return `Add or remove a skill from a monday platform agent.

Skills extend what an agent can do — for example, sending emails, searching the web, or querying databases. Each skill has a unique ID assigned by the platform.

IMPORTANT: Always call get_agent_catalog with type:"skills" first to discover available skills and resolve the correct skill_id. Never guess or invent a skill ID.

WORKFLOW:
1. Call get_agent_catalog with type:"skills" to list available skills and find the one the user wants by name/description. Note its id.
2. Call this tool with action:"add" or action:"remove" and the resolved skill_id.

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
        const variables: AddSkillToAgentMutationVariables = {
          agent_id: input.agent_id,
          skill_id: input.skill_id,
        };
        const res = await this.mondayApi.request<AddSkillToAgentMutation>(
          addSkillToAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Skill added to agent.',
            success: res.add_skill_to_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add skill to monday platform agent');
      }
    } else {
      try {
        const variables: RemoveSkillFromAgentMutationVariables = {
          agent_id: input.agent_id,
          skill_id: input.skill_id,
        };
        const res = await this.mondayApi.request<RemoveSkillFromAgentMutation>(
          removeSkillFromAgentMutation,
          variables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Skill removed from agent.',
            success: res.remove_skill_from_agent?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'remove skill from monday platform agent');
      }
    }
  }
}
