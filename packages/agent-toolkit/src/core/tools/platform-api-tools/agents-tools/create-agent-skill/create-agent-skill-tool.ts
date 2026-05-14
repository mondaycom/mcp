import { z } from 'zod';
import {
  CreateAgentSkillMutation,
  CreateAgentSkillMutationVariables,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import { createAgentSkillMutation } from './create-agent-skill.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const createAgentSkillToolSchema = {
  name: z.string().trim().min(1).describe('Display name of the new skill.'),
  content: z
    .string()
    .trim()
    .min(1)
    .describe('Markdown instructions defining what the skill does and how to execute it.'),
  description: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Short description of the skill shown in the catalog.'),
};

export class CreateAgentSkillTool extends BaseMondayApiTool<typeof createAgentSkillToolSchema> {
  name = 'create_agent_skill';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create monday Platform Agent Skill',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a new custom skill in the account-wide skill catalog.

Skills extend what an agent can do — for example, sending emails, searching the web, or querying databases. A skill created here is available to all agents in the account.

After creating a skill, use manage_agent_skills with action:"add" and the returned id to attach it to a specific agent.

USAGE EXAMPLE:
- { "name": "Send Slack Message", "content": "## Instructions\\nPost a message to a Slack channel.", "description": "Sends a message to Slack" }`;
  }

  getInputSchema() {
    return createAgentSkillToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createAgentSkillToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const variables: CreateAgentSkillMutationVariables = {
        name: input.name,
        content: input.content,
        description: input.description,
      };
      const res = await this.mondayApi.request<CreateAgentSkillMutation>(createAgentSkillMutation, variables, {
        versionOverride: 'dev',
      });
      if (!res.create_agent_skill) {
        throw new Error('create_agent_skill returned no data');
      }
      return {
        content: {
          message: 'Skill created. Use the returned id with manage_agent_skills action:add to attach it to an agent.',
          skill: res.create_agent_skill,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent skill');
    }
  }
}
