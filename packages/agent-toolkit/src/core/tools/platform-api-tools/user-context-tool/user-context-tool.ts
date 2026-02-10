import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getUserContextQuery, getFavoriteDetailsQuery } from './user-context.graphql';
import { GetUserContextQuery, GetFavoriteDetailsQuery, GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';
import { Favorite, RelevantBoard } from './user-context-tool.types';
import { TYPE_TO_QUERY_VAR, TYPE_TO_RESPONSE_KEY } from './user-context-tool.consts';

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
    return `Fetch current user information and their relevant items (boards, folders, workspaces, dashboards).
    
    Use this tool at the beginning of conversations to:
    - Get context about who the current user is (id, name, title)
    - Discover user's favorite boards, folders, workspaces, and dashboards
    - Get user's most relevant boards based on visit frequency and recency
    - Reduce the need for search requests by knowing user's commonly accessed items
    `;
  }

  getInputSchema(): undefined {
    return undefined;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const { me, favorites, intelligence } = await this.mondayApi.request<GetUserContextQuery>(
      getUserContextQuery,
      {},
      { versionOverride: 'dev' },
    );

    if (!me) {
      return {
        content: 'AUTHENTICATION_ERROR: Unable to fetch current user. Verify API token and user permissions.',
      };
    }

    const enrichedFavorites = await this.fetchFavorites(favorites || []);
    const relevantBoards = this.extractRelevantBoards(intelligence);

    const output = { user: me, favorites: enrichedFavorites, relevantBoards };
    return { content: JSON.stringify(output, null, 2) };
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

  private groupByType(favorites: NonNullable<GetUserContextQuery['favorites']>): Partial<Record<GraphqlMondayObject, string[]>> {
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
