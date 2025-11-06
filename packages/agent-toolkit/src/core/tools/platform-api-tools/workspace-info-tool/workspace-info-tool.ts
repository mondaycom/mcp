import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getWorkspaceInfo } from '../../../../monday-graphql/queries.graphql';
import { organizeWorkspaceInfoHierarchy } from './helpers';
import { GetWorkspaceInfoQuery } from 'src/monday-graphql/generated/graphql';

export const workspaceInfoToolSchema = {
  workspace_id: z.number().describe('The ID of the workspace to get information for'),
};

export class WorkspaceInfoTool extends BaseMondayApiTool<typeof workspaceInfoToolSchema> {
  name = 'workspace_info';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Workspace Information',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'This tool returns the boards, docs and folders in a workspace and which folder they are in. It returns up to 100 of each object type, if you receive 100 assume there are additional objects of that type in the workspace.';
  }

  getInputSchema(): typeof workspaceInfoToolSchema {
    return workspaceInfoToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof workspaceInfoToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables = {
      workspace_id: input.workspace_id,
    };

    const res = await this.mondayApi.request<GetWorkspaceInfoQuery>(getWorkspaceInfo, variables);

    if (!res.workspaces || res.workspaces.length === 0) {
      return {
        content: `No workspace found with ID ${input.workspace_id}`,
      };
    }

    const organizedInfo = organizeWorkspaceInfoHierarchy(res);

    return {
      content: `Workspace Information:

**Workspace:** ${organizedInfo.workspace.name} (ID: ${organizedInfo.workspace.id})
- Description: ${organizedInfo.workspace.description || 'No description'}
- Kind: ${organizedInfo.workspace.kind}
- State: ${organizedInfo.workspace.state}
- Default Workspace: ${organizedInfo.workspace.is_default_workspace ? 'Yes' : 'No'}
- Created: ${organizedInfo.workspace.created_at}
- Owners/Subscribers: ${organizedInfo.workspace.owners_subscribers.length} users

**Folders (${organizedInfo.folders.length}):**
${organizedInfo.folders
  .map(
    (folder: any) => `
📁 ${folder.name} (ID: ${folder.id})
  - Boards (${folder.boards.length}): ${folder.boards.map((b: any) => `${b.name} (${b.id})`).join(', ') || 'None'}
  - Docs (${folder.docs.length}): ${folder.docs.map((d: any) => `${d.name} (${d.id})`).join(', ') || 'None'}`,
  )
  .join('\n')}

**Root Level Items:**
- Boards (${organizedInfo.root_items.boards.length}): ${organizedInfo.root_items.boards.map((b: any) => `${b.name} (${b.id})`).join(', ') || 'None'}
- Docs (${organizedInfo.root_items.docs.length}): ${organizedInfo.root_items.docs.map((d: any) => `${d.name} (${d.id})`).join(', ') || 'None'}

**Summary:**
- Total Folders: ${organizedInfo.folders.length}
- Total Boards: ${organizedInfo.folders.reduce((sum: number, f: { boards: string | any[] }) => sum + f.boards.length, 0) + organizedInfo.root_items.boards.length}
- Total Docs: ${organizedInfo.folders.reduce((sum: number, f: { docs: string | any[] }) => sum + f.docs.length, 0) + organizedInfo.root_items.docs.length}

${JSON.stringify(organizedInfo, null, 2)}`,
    };
  }
}
