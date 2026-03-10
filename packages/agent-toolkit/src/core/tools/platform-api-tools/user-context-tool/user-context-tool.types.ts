import { GraphqlMondayObject } from '../../../../monday-graphql/generated/graphql/graphql';

export interface Favorite {
  id: string;
  name: string;
  type: GraphqlMondayObject;
}

export interface RelevantBoard {
  id: string;
  name: string;
}

export interface RelevantPerson {
  id: string;
  name: string;
}
