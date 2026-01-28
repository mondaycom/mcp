import { GetFavoriteDetailsQuery, GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';

export const TYPE_TO_QUERY_VAR: Record<GraphqlMondayObject, string> = {
  [GraphqlMondayObject.Board]: 'boardIds',
  [GraphqlMondayObject.Folder]: 'folderIds',
  [GraphqlMondayObject.Workspace]: 'workspaceIds',
  [GraphqlMondayObject.Dashboard]: 'dashboardIds',
};

export const TYPE_TO_RESPONSE_KEY: Record<GraphqlMondayObject, keyof Omit<GetFavoriteDetailsQuery, '__typename'>> = {
  [GraphqlMondayObject.Board]: 'boards',
  [GraphqlMondayObject.Folder]: 'folders',
  [GraphqlMondayObject.Workspace]: 'workspaces',
  [GraphqlMondayObject.Dashboard]: 'dashboards',
};
