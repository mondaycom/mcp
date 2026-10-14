import { GetUsersByIdsQuery, PeopleEntity, PeopleValue } from '../../../../monday-graphql/generated/graphql/graphql';

export type User = NonNullable<NonNullable<GetUsersByIdsQuery['users']>[number]>;

export type { PeopleEntity, PeopleValue };
