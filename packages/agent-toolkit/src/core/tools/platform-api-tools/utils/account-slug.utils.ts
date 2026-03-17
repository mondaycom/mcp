import { gql } from 'graphql-request';
import { ApiClient } from '@mondaydotcomorg/api';

const getAccountSlug = gql`
  query getAccountSlug {
    me {
      account {
        slug
      }
    }
  }
`;

export async function fetchAccountSlug(mondayApi: ApiClient): Promise<string | null> {
  const res = await mondayApi.request<{ me?: { account?: { slug?: string } } }>(getAccountSlug);
  return res.me?.account?.slug ?? null;
}

export function buildWorkspaceUrl(slug: string, workspaceId: string): string {
  return `https://${slug}.monday.com/workspaces/${workspaceId}`;
}
