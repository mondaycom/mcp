import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getUserContextQuery } from './user-context.graphql.dev';
import { getFavoriteDetailsQuery } from './user-context.graphql';
import { GetUserContextQuery } from '../../../../monday-graphql/generated/graphql.dev/graphql';
import { GetFavoriteDetailsQuery, GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';
import { Favorite, RelevantBoard, RelevantDoc, RelevantPerson } from './user-context-tool.types';
import { TYPE_TO_QUERY_VAR, TYPE_TO_RESPONSE_KEY } from './user-context-tool.consts';
import { getOnboardingContext } from './user-context-onboarding';
import { GraphQLErrorResponse } from '../../../../utils/graphql-error.types';

export class UserContextTool extends BaseMondayApiTool<undefined> {
  name = 'get_user_context';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get User Context',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Fetch current user information, account information, and their relevant items (boards, docs, folders, workspaces, dashboards).

    Use this tool to:
    - Get context about who the current user is (id, name, title)
    - Get account info: plan tier, active member count, trial status, and active products
    - Get the number of active members in the account (returns active_members_count)
    - Discover user's favorite boards, folders, workspaces, and dashboards
    - Get user's most relevant boards based on visit frequency and recency
    - Get user's most relevant docs based on load frequency and recency
    - Get user's most relevant people based on interaction frequency and recency
    - Reduce the need for search requests by knowing user's commonly accessed items

    If the user is likely new to monday.com, the response includes an "onboarding" object. In that case, offer to help the user get started, using onboarding.skill.guide (monday's recommended first-run flow).
    `;
  }

  getInputSchema(): undefined {
    return undefined;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const { me, boards, favorites, intelligence } = await this.fetchUserContext();

    if (!me) {
      return {
        content: 'AUTHENTICATION_ERROR: Unable to fetch current user. Verify API token and user permissions.',
      };
    }

    const enrichedFavorites = await this.fetchFavorites(favorites || []);
    const relevantBoards = this.extractRelevantBoards(intelligence);
    const relevantDocs = this.extractRelevantDocs(intelligence);
    const relevantPeople = this.extractRelevantPeople(intelligence);

    const onboarding = getOnboardingContext(me, boards);

    const { account, created_at: _userCreatedAt, ...user } = me;
    const accountContext = account
      ? {
          tier: account.tier,
          active_members_count: account.active_members_count,
          is_during_trial: account.is_during_trial,
          products: account.products?.filter(Boolean).map((p) => ({ kind: p!.kind, tier: p!.tier })) ?? [],
        }
      : null;

    const output = {
      user,
      account: accountContext,
      favorites: enrichedFavorites,
      relevantBoards,
      relevantDocs,
      relevantPeople,
      ...(onboarding && { onboarding }),
    };
    return { content: { message: 'User context', ...output } };
  }

  /**
   * The intelligence lists are optional context. When the only GraphQL errors are under
   * `intelligence` (e.g. a relevant doc whose name can't be read), use the partial data
   * instead of failing the tool. The entries with errors come back null and are filtered out.
   */
  private async fetchUserContext(): Promise<GetUserContextQuery> {
    try {
      return await this.mondayApi.request<GetUserContextQuery>(getUserContextQuery, {}, { versionOverride: 'dev' });
    } catch (error) {
      const response = (error as GraphQLErrorResponse)?.response;
      const data = response?.data as GetUserContextQuery | undefined;
      const errors = response?.errors ?? [];
      const onlyIntelligenceErrors = errors.length > 0 && errors.every((entry) => entry.path?.[0] === 'intelligence');

      if (data?.me && onlyIntelligenceErrors) {
        return data;
      }
      throw error;
    }
  }

  private async fetchFavorites(favorites: NonNullable<GetUserContextQuery['favorites']>): Promise<Favorite[]> {
    const idsByType = this.groupByType(favorites);
    const types = Object.keys(idsByType) as GraphqlMondayObject[];

    if (types.length === 0) {
      return [];
    }

    const queryVariables: Record<string, string[]> = {};
    for (const type of types) {
      queryVariables[TYPE_TO_QUERY_VAR[type]] = idsByType[type]!;
    }

    const response = await this.mondayApi.request<GetFavoriteDetailsQuery>(getFavoriteDetailsQuery, queryVariables);

    const result: Favorite[] = [];
    for (const type of types) {
      const responseKey = TYPE_TO_RESPONSE_KEY[type];

      for (const item of response[responseKey] ?? []) {
        if (item?.id) {
          result.push({ id: item.id, name: item.name, type });
        }
      }
    }

    return result;
  }

  private extractRelevantBoards(intelligence: GetUserContextQuery['intelligence']): RelevantBoard[] {
    if (!intelligence?.relevant_boards) {
      return [];
    }

    const result: RelevantBoard[] = [];

    for (const rb of intelligence.relevant_boards) {
      if (rb?.id && rb?.board?.name) {
        result.push({ id: rb.id, name: rb.board.name });
      }
    }

    return result;
  }

  private extractRelevantDocs(intelligence: GetUserContextQuery['intelligence']): RelevantDoc[] {
    if (!intelligence?.relevant_docs) {
      return [];
    }

    const result: RelevantDoc[] = [];

    for (const rd of intelligence.relevant_docs) {
      if (rd?.id && rd?.document?.name) {
        result.push({ id: rd.id, name: rd.document.name, objectId: rd.object_id });
      }
    }

    return result;
  }

  private extractRelevantPeople(intelligence: GetUserContextQuery['intelligence']): RelevantPerson[] {
    if (!intelligence?.relevant_people) {
      return [];
    }

    const result: RelevantPerson[] = [];

    for (const rp of intelligence.relevant_people) {
      if (rp?.id && rp?.user?.name) {
        result.push({ id: rp.id, name: rp.user.name });
      }
    }

    return result;
  }

  private groupByType(
    favorites: NonNullable<GetUserContextQuery['favorites']>,
  ): Partial<Record<GraphqlMondayObject, string[]>> {
    const result: Partial<Record<GraphqlMondayObject, string[]>> = {};

    for (const favorite of favorites) {
      const obj = favorite?.object;
      if (obj?.id && obj?.type) {
        (result[obj.type] ??= []).push(obj.id);
      }
    }

    return result;
  }
}
