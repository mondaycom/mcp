import { ApiClient } from '@mondaydotcomorg/api';
import { getAccountSlug } from './account-slug.utils.graphql';
import { GetAccountSlugQuery } from 'src/monday-graphql/generated/graphql/graphql';



export async function fetchAccountSlug(mondayApi: ApiClient): Promise<string | null> {
  const res = await mondayApi.request<GetAccountSlugQuery>(getAccountSlug);
  return res.me?.account?.slug ?? null;
}

export function buildWorkspaceUrl(slug: string, workspaceId: string): string {
  return `https://${slug}.monday.com/workspaces/${workspaceId}`;
}
