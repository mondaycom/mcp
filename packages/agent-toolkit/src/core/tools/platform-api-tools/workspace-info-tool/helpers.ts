import { GetWorkspaceInfoQuery } from 'src/monday-graphql/generated/graphql';
import { OrganizedWorkspaceInfo } from './types';

export function organizeWorkspaceInfoHierarchy(response: GetWorkspaceInfoQuery): OrganizedWorkspaceInfo {
  const { workspaces, boards, docs, folders } = response;

  // Get the workspace info (assuming single workspace)
  const workspace = workspaces?.[0];
  if (!workspace) throw new Error('No workspace found');

  // Create folder map
  const folderMap = new Map(
    (folders || [])
      .filter(
        (folder): folder is NonNullable<typeof folder> => folder != null && folder.id != null && folder.name != null,
      )
      .map((folder) => [
        folder.id!,
        {
          id: folder.id!,
          name: folder.name!,
          boards: [] as Array<{ id: string; name: string }>,
          docs: [] as Array<{ id: string; name: string }>,
        },
      ]),
  );

  // Organize boards
  const rootBoards: Array<{ id: string; name: string }> = [];
  (boards || [])
    .filter((board): board is NonNullable<typeof board> => board != null && board.id != null && board.name != null)
    .forEach((board) => {
      const boardItem = { id: board.id!, name: board.name! };
      if (board.board_folder_id && folderMap.has(board.board_folder_id)) {
        folderMap.get(board.board_folder_id)!.boards.push(boardItem);
      } else {
        rootBoards.push(boardItem);
      }
    });

  // Organize docs
  const rootDocs: Array<{ id: string; name: string }> = [];
  (docs || [])
    .filter((doc): doc is NonNullable<typeof doc> => doc != null && doc.id != null && doc.name != null)
    .forEach((doc) => {
      const docItem = { id: doc.id!, name: doc.name! };
      if (doc.doc_folder_id && folderMap.has(doc.doc_folder_id)) {
        folderMap.get(doc.doc_folder_id)!.docs.push(docItem);
      } else {
        rootDocs.push(docItem);
      }
    });

  return {
    workspace: {
      id: workspace.id!,
      name: workspace.name!,
      description: workspace.description || '',
      kind: workspace.kind || '',
      created_at: workspace.created_at || '',
      state: workspace.state || '',
      is_default_workspace: workspace.is_default_workspace || false,
      owners_subscribers: (workspace.owners_subscribers || [])
        .filter(
          (owner): owner is NonNullable<typeof owner> =>
            owner != null && owner.id != null && owner.name != null && owner.email != null,
        )
        .map((owner) => ({
          id: owner.id!,
          name: owner.name!,
          email: owner.email!,
        })),
    },
    folders: Array.from(folderMap.values()),
    root_items: {
      boards: rootBoards,
      docs: rootDocs,
    },
  };
}
