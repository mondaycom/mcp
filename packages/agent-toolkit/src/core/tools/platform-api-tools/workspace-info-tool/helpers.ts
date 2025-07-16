import { OrganizedWorkspaceInfo, WorkspaceInfoQueryResponse } from './types';

export function organizeWorkspaceInfoHierarchy(response: WorkspaceInfoQueryResponse): OrganizedWorkspaceInfo {
  const { workspaces, boards, docs, folders } = response;

  // Get the workspace info (assuming single workspace)
  const workspace = workspaces[0];

  // Create folder map
  const folderMap = new Map(
    folders.map((folder) => [
      folder.id,
      {
        ...folder,
        boards: [] as Array<{ id: string; name: string }>,
        docs: [] as Array<{ id: string; name: string }>,
      },
    ]),
  );

  // Organize boards
  const rootBoards: Array<{ id: string; name: string }> = [];
  boards.forEach((board) => {
    const boardItem = { id: board.id, name: board.name };
    if (board.board_folder_id && folderMap.has(board.board_folder_id)) {
      folderMap.get(board.board_folder_id)!.boards.push(boardItem);
    } else {
      rootBoards.push(boardItem);
    }
  });

  // Organize docs
  const rootDocs: Array<{ id: string; name: string }> = [];
  docs.forEach((doc) => {
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
      docs: rootDocs,
    },
  };
}
