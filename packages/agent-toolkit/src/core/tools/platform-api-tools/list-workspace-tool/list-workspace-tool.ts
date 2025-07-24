import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { listWorkspaces } from './list-workspace.graphql';
import { ListWorkspacesQuery } from '../../../../monday-graphql/generated/graphql';
import { DEFAULT_WORKSPACE_LIMIT } from './list-workspace.consts';

export const listWorkspaceToolSchema = {};

export class ListWorkspaceTool extends BaseMondayApiTool<typeof listWorkspaceToolSchema> {
  name = 'list_workspace';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Workspaces',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'List all workspaces available to the user. Returns up to 500 workspaces with their ID, name, and description.';
  }

  getInputSchema(): typeof listWorkspaceToolSchema {
    return listWorkspaceToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listWorkspaceToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      limit: DEFAULT_WORKSPACE_LIMIT,
    };

    const res = await this.mondayApi.request<ListWorkspacesQuery>(listWorkspaces, variables);

    if (!res.workspaces || res.workspaces.length === 0) {
      return {
        content: 'No workspaces found.',
      };
    }

    const workspacesList = res.workspaces
      .filter((workspace) => workspace !== null)
      .map((workspace) => {
        const description = workspace!.description ? ` - ${workspace!.description}` : '';
        return `• **${workspace!.name}** (ID: ${workspace!.id})${description}`;
      })
      .join('\n');

    return {
      content: `**Available Workspaces (${res.workspaces.length}):**

${workspacesList}

**Summary:**
Total workspaces found: ${res.workspaces.length}

${JSON.stringify(res.workspaces, null, 2)}`,
    };
  }
}
