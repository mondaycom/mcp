import { gql } from 'graphql-request';

// search.updates is available at runtime from API version 2026-10, but the
// codegen schema snapshot (2026-07) does not expose it yet. Hence the query and
// types are hand-written here and the request pins versionOverride: '2026-10'
// (same approach as list_automations' board-automations-query.ts). Remove once
// this field is promoted to stable and codegen can generate it.

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
