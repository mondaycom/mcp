import { gql } from 'graphql-request';

export const getBoardAutomationsQuery = gql`
  query getBoardAutomations($boardIds: [ID!], $limit: Int, $cursor: String) {
    board_automations(board_ids: $boardIds, limit: $limit, cursor: $cursor) {
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
    readonly items: BoardAutomation[] | null;
  } | null;
}

export interface BoardAutomationsQueryVariables {
  readonly boardIds?: string[];
  readonly limit?: number;
  readonly cursor?: string;
}
