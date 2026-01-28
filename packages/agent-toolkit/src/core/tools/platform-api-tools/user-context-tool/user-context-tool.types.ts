import { GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';

export interface Favorite {
  id: string;
  name: string;
  type: GraphqlMondayObject;
}
