export interface OrganizedWorkspaceInfo {
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
