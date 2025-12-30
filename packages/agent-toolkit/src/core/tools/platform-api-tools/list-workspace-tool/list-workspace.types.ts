export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
};

export type ListWorkspacesQueryResponse = {
  workspaces?: Array<Workspace | null> | null;
};

