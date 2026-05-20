import { gql } from 'graphql-request';

// File intentionally NOT named *.graphql.ts / *.graphql.dev.ts — board_automations
// is not yet in the fetched schema, so this query uses hand-written types and must
// stay outside the codegen-scanned globs.
// TODO: migrate to get_live_workflows on dev API when 2026-10 is sunset.

export const getBoardAutomationsQuery = gql`
  query getBoardAutomations($board_ids: [ID!]!, $limit: Int, $cursor: String) {
    board_automations(board_ids: $board_ids, limit: $limit, cursor: $cursor) {
      cursor
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
  readonly user_id: string | null;
  readonly active: boolean | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
  readonly workflow_host_data: unknown;
  readonly workflow_blocks: unknown;
  readonly workflow_variables: unknown;
  readonly importance: number | null;
  readonly notice_message: string | null;
  readonly template_reference_id: string | null;
}

export interface GetBoardAutomationsQuery {
  readonly board_automations?: {
    readonly cursor?: string | null;
    readonly items?: BoardAutomation[] | null;
  } | null;
}

export interface GetBoardAutomationsQueryVariables {
  readonly board_ids: string[];
  readonly limit?: number;
  readonly cursor?: string;
}
