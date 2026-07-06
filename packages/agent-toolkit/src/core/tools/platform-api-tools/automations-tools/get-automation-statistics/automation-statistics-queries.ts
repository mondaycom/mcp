import { gql } from 'graphql-request';

export const getAccountTriggerStatisticsQuery = gql`
  query GetAccountTriggerStatistics($filters: AccountTriggerStatisticsFiltersInput) {
    account_trigger_statistics(filters: $filters) {
      id
      success
      failure
      total
    }
  }
`;

export const getAccountTriggersByEntityQuery = gql`
  query GetAccountTriggersByEntity($runStatus: TriggerEventState!, $filters: AccountTriggersByEntityIdFiltersInput) {
    account_triggers_statistics_by_entity_id(run_status: $runStatus, filters: $filters) {
      id
      automation_statistics
      workflow_statistics
    }
  }
`;

export interface AccountTriggerStatisticsQueryResult {
  account_trigger_statistics: {
    id: string;
    success: number | null;
    failure: number | null;
    total: number | null;
  } | null;
}

export interface AccountTriggersByEntityQueryResult {
  account_triggers_statistics_by_entity_id: {
    id: string;
    automation_statistics: unknown;
    workflow_statistics: unknown;
  } | null;
}
