import { gql } from 'graphql-request';

// File intentionally NOT named *.graphql.ts / *.graphql.dev.ts — board_automations
// is not yet in the fetched schema, so this query uses hand-written types and must
// stay outside the codegen-scanned globs.

export const getBoardAutomationsQuery = gql`
  query getBoardAutomations($boardIds: [ID!]!) {
    board_automations(board_ids: $boardIds) {
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
    readonly items?: BoardAutomation[] | null;
  } | null;
}

export interface GetBoardAutomationsQueryVariables {
  readonly boardIds: string[];
}
