import { ListWorkspacesQuery } from '../../../../monday-graphql/generated/graphql/graphql';

type Workspace = NonNullable<NonNullable<ListWorkspacesQuery['workspaces']>[number]>;

export function filterNullWorkspaces(response: ListWorkspacesQuery): Workspace[] {
  const filteredWorkspaces = response.workspaces?.filter((w): w is NonNullable<typeof w> => w !== null);
  return filteredWorkspaces || [];
}
