import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { getWorkspaceInfo } from '../../../monday-graphql/queries.graphql';

export const workspaceInfoToolSchema = {
  workspace_id: z.number().describe('The ID of the workspace to get information for'),
};

interface WorkspaceInfoQueryResponse {
  workspaces: Array<{
    id: string;
    name: string;
    description: string;
    kind: string;
    created_at: string;
    state: string;
    is_default_workspace: boolean;
    owners_subscribers: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  }>;
  boards: Array<{
    id: string;
    name: string;
    board_folder_id: string | null;
  }>;
  docs: Array<{
    id: string;
    name: string;
    doc_folder_id: string | null;
  }>;
  folders: Array<{
    id: string;
    name: string;
  }>;
}

interface OrganizedWorkspaceInfo {
  workspace: {
    id: string;
    name: string;
    description: string;
    kind: string;
    created_at: string;
    state: string;
    is_default_workspace: boolean;
    owners_subscribers: Array<{
      id: string;
      name: string;
      email: string;
    }>;
  };
  folders: Array<{
    id: string;
    name: string;
    boards: Array<{
      id: string;
      name: string;
    }>;
    docs: Array<{
      id: string;
      name: string;
    }>;
  }>;
  root_items: {
    boards: Array<{
      id: string;
      name: string;
    }>;
    docs: Array<{
      id: string;
      name: string;
    }>;
  };
}

export function organizeWorkspaceInfoHierarchy(response: WorkspaceInfoQueryResponse): OrganizedWorkspaceInfo {
  const { workspaces, boards, docs, folders } = response;
  
  // Get the workspace info (assuming single workspace)
  const workspace = workspaces[0];
  
  // Create folder map
  const folderMap = new Map(folders.map(folder => [folder.id, {
    ...folder,
    boards: [] as Array<{ id: string; name: string; }>,
    docs: [] as Array<{ id: string; name: string; }>
  }]));
  
  // Organize boards
  const rootBoards: Array<{ id: string; name: string; }> = [];
  boards.forEach(board => {
    const boardItem = { id: board.id, name: board.name };
    if (board.board_folder_id && folderMap.has(board.board_folder_id)) {
      folderMap.get(board.board_folder_id)!.boards.push(boardItem);
    } else {
      rootBoards.push(boardItem);
    }
  });
  
  // Organize docs
  const rootDocs: Array<{ id: string; name: string; }> = [];
  docs.forEach(doc => {
    const docItem = { id: doc.id, name: doc.name };
    if (doc.doc_folder_id && folderMap.has(doc.doc_folder_id)) {
      folderMap.get(doc.doc_folder_id)!.docs.push(docItem);
    } else {
      rootDocs.push(docItem);
    }
  });
  
  return {
    workspace,
    folders: Array.from(folderMap.values()),
    root_items: {
      boards: rootBoards,
      docs: rootDocs
    }
  };
}

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

  protected async executeInternal(input: ToolInputType<typeof workspaceInfoToolSchema>): Promise<ToolOutputType<never>> {
    const variables = {
      workspace_id: input.workspace_id,
    };

    const res = await this.mondayApi.request<WorkspaceInfoQueryResponse>(getWorkspaceInfo, variables);

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
${organizedInfo.folders.map(folder => `
📁 ${folder.name} (ID: ${folder.id})
  - Boards (${folder.boards.length}): ${folder.boards.map(b => `${b.name} (${b.id})`).join(', ') || 'None'}
  - Docs (${folder.docs.length}): ${folder.docs.map(d => `${d.name} (${d.id})`).join(', ') || 'None'}`).join('\n')}

**Root Level Items:**
- Boards (${organizedInfo.root_items.boards.length}): ${organizedInfo.root_items.boards.map(b => `${b.name} (${b.id})`).join(', ') || 'None'}
- Docs (${organizedInfo.root_items.docs.length}): ${organizedInfo.root_items.docs.map(d => `${d.name} (${d.id})`).join(', ') || 'None'}

**Summary:**
- Total Folders: ${organizedInfo.folders.length}
- Total Boards: ${organizedInfo.folders.reduce((sum, f) => sum + f.boards.length, 0) + organizedInfo.root_items.boards.length}
- Total Docs: ${organizedInfo.folders.reduce((sum, f) => sum + f.docs.length, 0) + organizedInfo.root_items.docs.length}

${JSON.stringify(organizedInfo, null, 2)}`,
    };
  }
} 