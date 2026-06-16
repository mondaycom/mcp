import { gql } from 'graphql-request';

const TRIGGER_EVENT_FIELDS = `
  triggerUuid
  eventState
  eventKind
  triggerStartedAt
  createdAt
  triggerDuration
  errorReason
  entityKind
  hostType
  hostInstanceId
  billingActionsCount
  creatorAppFeatureReferenceId
  waitingForTriggerName
  reignitionSubscriptionId
`;

export const getTriggerEventsQuery = gql`
  query GetTriggerEvents($nextPageOffset: Int, $filters: TriggerEventsFiltersInput) {
    trigger_events(nextPageOffset: $nextPageOffset, filters: $filters) {
      triggerEvents {
        ${TRIGGER_EVENT_FIELDS}
      }
    }
  }
`;

export const getTriggerEventQuery = gql`
  query GetTriggerEvent($triggerUuid: String!) {
    trigger_event(triggerUuid: $triggerUuid) {
      ${TRIGGER_EVENT_FIELDS}
    }
  }
`;

export const getBlockEventsQuery = gql`
  query GetBlockEvents($triggerUuid: String!, $nextPageOffset: Int) {
    block_events(triggerUuid: $triggerUuid, nextPageOffset: $nextPageOffset) {
      blockEvents {
        atomicActionId
        title
        eventState
        errorReason
        conditionSatisfied
        blockStartTimestamp
        blockFinishTimestamp
        billingActionCountForBlock
        entityKind
        workflowNodeId
        iterator_id
        current_iteration
        max_iterations
      }
    }
  }
`;

export const getToolEventsQuery = gql`
  query GetToolEvents($triggerUuid: String!, $nextPageOffset: Int) {
    tool_events(trigger_uuid: $triggerUuid, next_page_offset: $nextPageOffset) {
      tool_events {
        id
        tool_name
        mcp_server
        event_status
        error_message
        execution_duration_ms
        tool_start_timestamp
        tool_finish_timestamp
        atomic_action_id
      }
    }
  }
`;

export interface TriggerEventsQueryResult {
  trigger_events: {
    triggerEvents: TriggerEventData[] | null;
  } | null;
}

export interface TriggerEventQueryResult {
  trigger_event: TriggerEventData | null;
}

export interface BlockEventsQueryResult {
  block_events: {
    blockEvents: BlockEventData[] | null;
  } | null;
}

export interface ToolEventsQueryResult {
  tool_events: {
    tool_events: ToolEventData[] | null;
  } | null;
}

export interface TriggerEventData {
  triggerUuid: string | null;
  eventState: string | null;
  eventKind: string | null;
  triggerStartedAt: string | null;
  createdAt: string | null;
  triggerDuration: number | null;
  errorReason: string | null;
  entityKind: string | null;
  hostType: string | null;
  hostInstanceId: string | null;
  billingActionsCount: number | null;
  creatorAppFeatureReferenceId: string | null;
  waitingForTriggerName: string | null;
  reignitionSubscriptionId: string | null;
}

export interface BlockEventData {
  atomicActionId: string | null;
  title: string | null;
  eventState: string | null;
  errorReason: string | null;
  conditionSatisfied: boolean | null;
  blockStartTimestamp: number | null;
  blockFinishTimestamp: number | null;
  billingActionCountForBlock: number | null;
  entityKind: string | null;
  workflowNodeId: number | null;
  iterator_id: string | null;
  current_iteration: number | null;
  max_iterations: number | null;
}

export interface ToolEventData {
  id: string | null;
  tool_name: string | null;
  mcp_server: string | null;
  event_status: string | null;
  error_message: string | null;
  execution_duration_ms: number | null;
  tool_start_timestamp: number | null;
  tool_finish_timestamp: number | null;
  atomic_action_id: string | null;
}
