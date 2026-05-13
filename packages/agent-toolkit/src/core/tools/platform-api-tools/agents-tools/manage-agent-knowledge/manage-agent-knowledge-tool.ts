import { z } from 'zod';
import {
  GetAgentKnowledgeQuery,
  GetAgentKnowledgeQueryVariables,
  AddAgentResourceAccessMutation,
  AddAgentResourceAccessMutationVariables,
  RemoveAgentResourceAccessMutation,
  RemoveAgentResourceAccessMutationVariables,
  UpdateAgentResourceAccessMutation,
  UpdateAgentResourceAccessMutationVariables,
  KnowledgeScope,
  KnowledgePermission,
} from '../../../../../monday-graphql/generated/graphql.dev/graphql';
import {
  getAgentKnowledgeQuery,
  addAgentResourceAccessMutation,
  removeAgentResourceAccessMutation,
  updateAgentResourceAccessMutation,
} from './manage-agent-knowledge.graphql.dev';
import { ToolInputType, ToolOutputType, ToolType } from '../../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../../base-monday-api-tool';
import { rethrowWithContext } from '../../../../../utils';

export const manageAgentKnowledgeToolSchema = {
  action: z.enum(['list', 'add', 'update', 'remove']).describe(
    '"list" — returns all resources the agent currently has access to. "add" — grants access to a board or doc. "update" — changes the permission level on an existing resource. "remove" — revokes the agent\'s access to a board or doc.',
  ),
  agent_id: z.string().trim().min(1).describe('Unique identifier of the agent.'),
  resource_id: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Required for action:add, action:update, action:remove. The ID of the board or doc to grant/update/revoke access to.'),
  scope_type: z
    .enum(['BOARD', 'DOC'])
    .optional()
    .describe('Required for action:add, action:update, action:remove. The type of resource: "BOARD" or "DOC".'),
  permission_type: z
    .enum(['READ', 'READ_WRITE'])
    .optional()
    .describe(
      'Required for action:add and action:update. The permission level: "READ" (agent can read the resource) or "READ_WRITE" (agent can read and write the resource).',
    ),
};

export class ManageAgentKnowledgeTool extends BaseMondayApiTool<typeof manageAgentKnowledgeToolSchema> {
  name = 'manage_agent_knowledge';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Manage monday Platform Agent Knowledge',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `List, grant, update, or revoke a monday platform agent's access to boards and docs.

An agent's "knowledge" is the set of monday.com boards and docs it can read from or write to during a run.

- list: Returns all resources the agent currently has access to, including permission level and resource type.
- add: Grants the agent access to a board or doc with the specified permission level.
- update: Changes the permission level on a resource the agent already has access to.
- remove: Revokes the agent's access to a board or doc entirely.

IMPORTANT: Call with action:"list" first to see the current resource access before adding, updating, or removing.

Permission types:
- READ: Agent can read data from the resource.
- READ_WRITE: Agent can read and write data to the resource.

USAGE EXAMPLES:
- List: { "action": "list", "agent_id": "7" }
- Add board access: { "action": "add", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD", "permission_type": "READ" }
- Update to read-write: { "action": "update", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD", "permission_type": "READ_WRITE" }
- Remove access: { "action": "remove", "agent_id": "7", "resource_id": "42", "scope_type": "BOARD" }`;
  }

  getInputSchema() {
    return manageAgentKnowledgeToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof manageAgentKnowledgeToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.action === 'list') {
      try {
        const res = await this.mondayApi.request<GetAgentKnowledgeQuery>(
          getAgentKnowledgeQuery,
          { id: input.agent_id } satisfies GetAgentKnowledgeQueryVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Current agent resource access.',
            knowledge: res.agent_knowledge ?? { resources: [], files: [] },
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'list agent knowledge for monday platform agent');
      }
    } else if (input.action === 'add') {
      if (!input.resource_id || !input.scope_type || !input.permission_type) {
        throw new Error('resource_id, scope_type, and permission_type are required for action:add');
      }
      try {
        const res = await this.mondayApi.request<AddAgentResourceAccessMutation>(
          addAgentResourceAccessMutation,
          {
            id: input.agent_id,
            resource_id: input.resource_id,
            scope_type: input.scope_type as KnowledgeScope,
            permission_type: input.permission_type as KnowledgePermission,
          } satisfies AddAgentResourceAccessMutationVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Resource access granted to agent.',
            success: res.add_agent_resource_access?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'add agent resource access for monday platform agent');
      }
    } else if (input.action === 'update') {
      if (!input.resource_id || !input.scope_type || !input.permission_type) {
        throw new Error('resource_id, scope_type, and permission_type are required for action:update');
      }
      try {
        const res = await this.mondayApi.request<UpdateAgentResourceAccessMutation>(
          updateAgentResourceAccessMutation,
          {
            id: input.agent_id,
            resource_id: input.resource_id,
            scope_type: input.scope_type as KnowledgeScope,
            permission_type: input.permission_type as KnowledgePermission,
          } satisfies UpdateAgentResourceAccessMutationVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Resource access updated.',
            success: res.update_agent_resource_access?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'update agent resource access for monday platform agent');
      }
    } else {
      if (!input.resource_id || !input.scope_type) {
        throw new Error('resource_id and scope_type are required for action:remove');
      }
      try {
        const res = await this.mondayApi.request<RemoveAgentResourceAccessMutation>(
          removeAgentResourceAccessMutation,
          {
            id: input.agent_id,
            resource_id: input.resource_id,
            scope_type: input.scope_type as KnowledgeScope,
          } satisfies RemoveAgentResourceAccessMutationVariables,
          { versionOverride: 'dev' },
        );
        return {
          content: {
            message: 'Resource access removed from agent.',
            success: res.remove_agent_resource_access?.success ?? false,
          },
        };
      } catch (error) {
        rethrowWithContext(error, 'remove agent resource access for monday platform agent');
      }
    }
  }
}
