import { GetAccountContextQuery } from '../../../../monday-graphql/generated/graphql/graphql';

export type AccountData = NonNullable<NonNullable<GetAccountContextQuery['me']>['account']>;

export interface AccountProduct {
  id: string;
  kind: string;
  tier: string | null;
  default_workspace_id: string | null;
}

export interface AccountContextResponse {
  account: AccountData;
  products: AccountProduct[];
}

export const formatAccountContext = (account: AccountData): AccountContextResponse => {
  const products: AccountProduct[] = (account.products ?? [])
    .filter((p): p is NonNullable<typeof p> => p !== null && p?.id !== null && p?.kind !== null)
    .map((p) => ({
      id: p.id!,
      kind: p.kind!,
      tier: p.tier ?? null,
      default_workspace_id: p.default_workspace_id ?? null,
    }));

  return {
    account,
    products,
  };
};
