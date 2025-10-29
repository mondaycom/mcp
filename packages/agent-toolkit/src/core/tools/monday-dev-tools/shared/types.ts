import {
  GetSprintsBoardItemsWithColumnsQuery,
  CheckboxValue,
  DateValue,
  TimelineValue,
  DocValue,
  GetRecentBoardsQuery,
} from '../../../../monday-graphql/generated/graphql';
import type { MONDAY_DEV_TASK_COLUMN_IDS } from './constants';


export type MondayDevTaskColumnId = (typeof MONDAY_DEV_TASK_COLUMN_IDS)[keyof typeof MONDAY_DEV_TASK_COLUMN_IDS];

export type Sprint = NonNullable<
  NonNullable<NonNullable<GetSprintsBoardItemsWithColumnsQuery['boards']>[number]>['items_page']
>['items'][number];

export type Board = NonNullable<NonNullable<GetRecentBoardsQuery['boards']>[number]>;

export interface SprintsBoardPair {
  sprintsBoard: {
    id: string;
    name: string;
    workspaceId: string;
    workspaceName: string;
  };
  tasksBoard: {
    id: string;
    name: string;
    workspaceId: string;
    workspaceName: string;
  };
}

export type { CheckboxValue, DateValue, TimelineValue, DocValue };
