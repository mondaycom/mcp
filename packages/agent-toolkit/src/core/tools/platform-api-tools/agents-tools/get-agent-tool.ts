import { z } from 'zod';
import { GetAgentQuery, ListAgentsQuery } from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { getAgentQuery, listAgentsQuery } from './agents.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from '../../../../utils';

export const getAgentToolSchema = {
  id: z
    .string()
    .trim()
    .min(1, 'Agent id must be a non-empty string')
    .optional()
    .describe(
      'Unique identifier of a monday platform agent. When provided, returns that single agent. When omitted, returns every non-deleted personal agent owned by the authenticated user.',
    ),
};

export class GetAgentTool extends BaseMondayApiTool<typeof getAgentToolSchema> {
  name = 'get_agent';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get monday Platform Agent(s)',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch one or more personal/custom agents on the monday.com platform.

monday platform agents are user-built workflows that live on the monday.com platform — each has a profile (name, role, avatar), a goal, and an execution plan in markdown describing capabilities and operating principles. Agents in state ACTIVE can be triggered to perform automated work on monday boards. They are NOT local LangChain or MCP agents — they are managed entities on the monday.com platform owned by a specific user.

Terminology note: users might ask for "agent" in natural language (for example: "create me an agent"), but in this API context this refers to monday personal/custom agents.

Agent state in get_agent results is one of: ACTIVE, INACTIVE, ARCHIVED, FAILED. (DELETED agents are filtered from these queries — DELETED only appears as the return value of delete_agent.) Agent kind is one of: PERSONAL, ACCOUNT_LEVEL, EXTERNAL.

Pass id to fetch one specific agent by its unique identifier. Omit id to list every non-deleted personal agent owned by the authenticated user; an empty list means the user owns no agents (not an error).

USAGE EXAMPLES:
- Fetch one agent: { "id": "42" }
- List all my agents: {}`;
  }

  getInputSchema() {
    return getAgentToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getAgentToolSchema>): Promise<ToolOutputType<never>> {
    if (input.id !== undefined) {
      try {
        const { agent } = await this.mondayApi.request<GetAgentQuery>(
          getAgentQuery,
          { id: input.id },
          { versionOverride: 'dev' },
        );

        if (!agent) {
          return {
            content: `monday platform agent ${input.id} not found, or the authenticated user does not have access to it.`,
          };
        }

        return { content: { message: 'monday platform agent', agent } };
      } catch (error) {
        rethrowWithContext(error, 'get monday platform agent');
      }
    }

    try {
      const { agents } = await this.mondayApi.request<ListAgentsQuery>(
        listAgentsQuery,
        {},
        { versionOverride: 'dev' },
      );

      const list = agents ?? [];
      return {
        content: {
          message: 'monday platform agents owned by the authenticated user',
          count: list.length,
          agents: list,
        },
      };
    } catch (error) {
      rethrowWithContext(error, 'list monday platform agents');
    }
  }
}
