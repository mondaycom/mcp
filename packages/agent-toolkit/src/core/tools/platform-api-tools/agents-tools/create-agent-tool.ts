import { z } from 'zod';
import {
  CreateAgentMutation,
  CreateAgentMutationVariables,
  CreateBlankAgentMutation,
  CreateBlankAgentMutationVariables,
} from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { createAgentMutation, createBlankAgentMutation } from './agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';

export const createAgentToolSchema = {
  prompt: z
    .string()
    .trim()
    .min(1, 'Prompt must be a non-empty string')
    .optional()
    .describe(
      'Plain-language description of what the monday platform agent should do. When provided, the platform uses this prompt to generate the agent profile (name, role, avatar), goal, and execution plan via AI. Be specific about the domain and the tasks the agent should automate.',
    ),
  agent_model: z
    .string()
    .optional()
    .describe(
      'STRONGLY DISCOURAGED — omit this field. Only set when the user explicitly names a monday-supported model. Do not invent or guess model identifiers (e.g. "gpt-4o", "claude-3-opus"); invalid values are rejected by the platform. When omitted the platform default is used, which is the right choice in almost every case.',
    ),
  name: z.string().trim().min(1, 'Name must be a non-empty string').optional().describe('Display name of the agent.'),
  role: z.string().trim().min(1, 'Role must be a non-empty string').optional().describe('Role of the agent.'),
  role_description: z
    .string()
    .trim()
    .min(1, 'Role description must be a non-empty string')
    .optional()
    .describe('Description of the role.'),
  avatar_url: z
    .string()
    .trim()
    .min(1, 'Avatar URL must be a non-empty string')
    .optional()
    .describe(
      'HTTPS URL of the avatar image. Prefer dapulse-res.cloudinary.com or cdn.monday.com for full renderer compatibility.',
    ),
  gender: z
    .enum(['male', 'female'])
    .optional()
    .describe('Hint for generated avatar/name when profile fields are omitted.'),
  background_color: z
    .string()
    .trim()
    .min(1, 'Background color must be a non-empty string')
    .optional()
    .describe('Background color string, usually lowercase hex like "#9450fd".'),
  user_prompt: z
    .string()
    .trim()
    .min(1, 'User prompt must be a non-empty string')
    .optional()
    .describe('Stored as metadata only. Not used for AI generation.'),
};

export class CreateAgentTool extends BaseMondayApiTool<typeof createAgentToolSchema> {
  name = 'create_agent';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create monday Platform Agent',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Create a personal/custom agent on the monday.com platform. See get_agent for what a monday platform agent is.

Terminology note: users might ask for "agent" in natural language (for example: "create me an agent"), but in this API context this refers to monday personal/custom agents.

Two modes:
- Prompt mode (recommended): pass prompt (and optional agent_model) and the platform generates profile + goal + plan via AI.
- Manual mode: omit prompt and pass any of name/role/role_description/user_prompt to create a blank agent profile quickly.

Do not mix prompt with manual profile fields in one request.

Created agents start in state INACTIVE and must be activated before they can be triggered. There is no activation tool yet — instruct the user to activate from the monday.com agent settings UI (a dedicated activate_agent tool is planned for a future release).

created_at and updated_at are null in the response — call get_agent with the returned id afterward to fetch them.

USAGE EXAMPLES:
- AI-generated: { "prompt": "Run my daily standup — collect status updates, summarize blockers, and post recap every weekday at 9am." }
- Blank/manual: { "name": "Standup Bot", "role": "Project Manager", "gender": "female" }
- Blank/defaults: {}`;
  }

  getInputSchema() {
    return createAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof createAgentToolSchema>): Promise<ToolOutputType<never>> {
    const hasPrompt = input.prompt !== undefined;
    const hasManualFields =
      input.name !== undefined ||
      input.role !== undefined ||
      input.role_description !== undefined ||
      input.avatar_url !== undefined ||
      input.gender !== undefined ||
      input.background_color !== undefined ||
      input.user_prompt !== undefined;

    if (hasPrompt && hasManualFields) {
      throw new Error(
        'create_agent accepts either prompt mode or manual mode. Do not pass prompt together with manual profile fields.',
      );
    }

    if (!hasPrompt && input.agent_model !== undefined) {
      throw new Error('agent_model can only be used when prompt is provided.');
    }

    if (!hasPrompt) {
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
        const res = await this.mondayApi.request<CreateBlankAgentMutation>(createBlankAgentMutation, variables, {
          versionOverride: 'dev',
        });

        if (!res.create_blank_agent?.id) {
          throw new Error('monday platform agent creation returned no id');
        }

        return {
          content: {
            message: `monday platform agent ${res.create_blank_agent.id} created in state INACTIVE — user must activate it from the monday.com UI before it can be triggered`,
            agent: res.create_blank_agent,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'create blank monday platform agent');
      }
    }

    try {
      const prompt = input.prompt as string;
      const variables: CreateAgentMutationVariables = {
        input: {
          prompt,
          agent_model: input.agent_model,
        },
      };

      const res = await this.mondayApi.request<CreateAgentMutation>(createAgentMutation, variables, {
        versionOverride: 'dev',
      });

      if (!res.create_agent?.id) {
        throw new Error('monday platform agent creation returned no id');
      }

      return {
        content: {
          message: `monday platform agent ${res.create_agent.id} created in state INACTIVE — user must activate it from the monday.com UI before it can be triggered`,
          agent: res.create_agent,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'create monday platform agent');
    }
  }
}
