import { gql } from 'graphql-request';

// board_automations is available at runtime for version 2026-10, but the
// schema snapshot used by codegen does not expose it yet.
export const getBoardAutomationsQuery = gql`
  query getBoardAutomations($boardIds: [ID!], $limit: Int, $cursor: String, $includeLegacy: Boolean!) {
    board_automations(board_ids: $boardIds, limit: $limit, cursor: $cursor) {
      cursor
      legacy_automations @include(if: $includeLegacy)
      items {
        id
        user_id
        active
        title
        description
        created_at
        updated_at
        workflow_host_data
        workflow_blocks
        workflow_variables
        importance
        notice_message
        template_reference_id
      }
    }
  }
`;

export interface BoardAutomation {
  readonly id: string;
  readonly user_id: string | number | null;
  readonly active: boolean | null;
  readonly title: string;
  readonly description: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly workflow_host_data: unknown;
  readonly workflow_blocks: unknown;
  readonly workflow_variables: unknown;
  readonly importance: number | null;
  readonly notice_message: string | null;
  readonly template_reference_id: string | null;
}

export interface BoardAutomationsQuery {
  readonly board_automations: {
    readonly cursor: string | null;
    // Read-only automations set up in an older way. Present only on the first page
    // (when includeLegacy is true). Loose passthrough of a frozen, externally-owned contract.
    readonly legacy_automations?: unknown;
    readonly items: BoardAutomation[] | null;
  } | null;
}

export interface BoardAutomationsQueryVariables {
  readonly boardIds?: string[];
  readonly limit?: number;
  readonly cursor?: string;
  readonly includeLegacy: boolean;
}
