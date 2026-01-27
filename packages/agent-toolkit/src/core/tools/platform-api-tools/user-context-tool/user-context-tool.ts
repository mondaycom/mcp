import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getUserContextQuery, getFavoriteDetailsQuery } from './user-context.graphql';
import { GetUserContextQuery, GetFavoriteDetailsQuery, GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';
import { Favorite } from './user-context-tool.types';
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
    - Get context about who the current user is (name, title)
    - Discover user's favorite/recently used boards, folders, workspaces, and dashboards
    - Reduce the need for search requests by knowing user's commonly accessed items
    
    This tool takes no parameters and returns:
    - User info: id, name, title
    - Favorite boards, folders, workspaces, and dashboards
    `;
  }

  getInputSchema(): undefined {
    return undefined;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const { me, favorites } = await this.mondayApi.request<GetUserContextQuery>(getUserContextQuery);

    if (!me) {
      return {
        content: 'AUTHENTICATION_ERROR: Unable to fetch current user. Verify API token and user permissions.',
      };
    }

    const enrichedFavorites = await this.fetchFavorites(favorites || []);

    const output = { user: me, favorites: enrichedFavorites };
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
