import { gql } from 'graphql-request';

// search.updates and search.timeline_items are available at runtime from API
// version 2026-10, but the codegen schema snapshot (2026-07) does not expose
// them yet. Queries and types are hand-written here and requests pin
// versionOverride: '2026-10' (same approach as list_automations'
// board-automations-query.ts). Remove once promoted to stable and codegen can
// generate them.

export const searchUpdates = gql`
  query SearchUpdates($query: String!, $limit: Int, $boardIds: [ID!], $creatorIds: [ID!]) {
    search {
      updates(query: $query, limit: $limit, board_ids: $boardIds, creator_ids: $creatorIds) {
        results {
          id
          indexed_data {
            id
            body
            creator_id
            item_id
            board_id
          }
        }
      }
    }
  }
`;

export interface SearchIndexedUpdate {
  readonly id: string;
  readonly body: string;
  readonly creator_id: string;
  readonly item_id: string;
  readonly board_id: string;
}

export interface SearchUpdatesQuery {
  readonly search: {
    readonly updates: {
      readonly results: ReadonlyArray<{
        readonly id: string;
        readonly indexed_data: SearchIndexedUpdate;
      }>;
    };
  };
}

export interface SearchUpdatesQueryVariables {
  readonly query: string;
  readonly limit?: number;
  readonly boardIds?: string[];
  readonly creatorIds?: string[];
}

export const searchTimelineItems = gql`
  query SearchTimelineItems($query: String!, $limit: Int) {
    search {
      timeline_items(query: $query, limit: $limit) {
        results {
          id
          indexed_data {
            id
            title
            summary
          }
        }
      }
    }
  }
`;

export interface SearchIndexedTimelineItem {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

export interface SearchTimelineItemsQuery {
  readonly search: {
    readonly timeline_items: {
      readonly results: ReadonlyArray<{
        readonly id: string;
        readonly indexed_data: SearchIndexedTimelineItem;
      }>;
    };
  };
}

export interface SearchTimelineItemsQueryVariables {
  readonly query: string;
  readonly limit?: number;
}
