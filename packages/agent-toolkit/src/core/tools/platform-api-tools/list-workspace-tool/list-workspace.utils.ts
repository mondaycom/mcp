import { normalizeString } from 'src/utils/string.utils';
import { DEFAULT_WORKSPACE_LIMIT } from './list-workspace.consts';
import { ListWorkspacesQuery } from '../../../../monday-graphql/generated/graphql/graphql';

type Workspace = NonNullable<NonNullable<ListWorkspacesQuery['workspaces']>[number]>;

export function filterNullWorkspaces(response: ListWorkspacesQuery): Workspace[] {
  const filteredWorkspaces = response.workspaces?.filter((w): w is NonNullable<typeof w> => w !== null);
  return filteredWorkspaces || [];
}

export function hasMatchingWorkspace(searchTermNormalized: string, workspaces: Workspace[]): boolean {
  return workspaces.some(workspace => normalizeString(workspace!.name).includes(searchTermNormalized));
}

export function filterWorkspacesBySearchTerm(
  searchTermNormalized: string | null,
  workspaces: Workspace[],
  page: number,
  limit: number,
): Workspace[] {
  // If there is no more than single page of results, let LLM do the filtering
  if (!searchTermNormalized || workspaces.length <= DEFAULT_WORKSPACE_LIMIT) {
    return workspaces;
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return workspaces
    .filter(workspace => normalizeString(workspace!.name).includes(searchTermNormalized))
    .slice(startIndex, endIndex);
}

export function formatWorkspacesList(workspaces: Workspace[]): string {
  return workspaces
    .map(workspace => {
      const description = workspace!.description ? ` - ${workspace!.description}` : '';
      return `• **${workspace!.name}** (ID: ${workspace!.id})${description}`;
    })
    .join('\n');
}
