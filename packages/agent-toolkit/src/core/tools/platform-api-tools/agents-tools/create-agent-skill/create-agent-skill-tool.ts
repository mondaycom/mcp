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
  name: z.string().trim().min(1).describe('Display name of the skill.'),
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
    return `Create a new custom skill in the account's skill catalog.

Skills define reusable capabilities that agents can execute (e.g. "send a Slack message", "query a database"). Once created, the skill appears in the catalog and can be attached to any agent via manage_agent_skills.

WORKFLOW:
1. Call this tool to create the skill. Note the returned id.
2. Call manage_agent_skills with action:"add" and the returned id to attach it to an agent.
3. Call get_agent_catalog with type:"skills" to verify the skill appears in the catalog.

USAGE EXAMPLE:
- { "name": "Send Slack Message", "content": "## Instructions\\nSend a message to the specified Slack channel using the provided text.", "description": "Sends a message to a Slack channel" }`;
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
          message: 'Skill created. Use the returned id with manage_agent_skills to attach it to an agent.',
          skill: res.create_agent_skill,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent skill');
    }
  }
}
