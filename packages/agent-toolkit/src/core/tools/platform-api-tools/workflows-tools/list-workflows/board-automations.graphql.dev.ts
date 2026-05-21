import { gql } from 'graphql-request';

export const getLiveWorkflowsQuery = gql`
  query getLiveWorkflows($hostInstanceId: String, $hostType: HostType, $pagination: PaginationInput) {
    get_live_workflows(hostInstanceId: $hostInstanceId, hostType: $hostType, pagination: $pagination) {
      id
      user_id
      is_active
      title
      description
      created_at
      updated_at
      workflow_host_data {
        id
        type
      }
      workflow_blocks {
        workflowNodeId
        blockReferenceId
        title
        kind
      }
      workflow_variables
      importance
      notice_message
      template_reference_id
    }
  }
`;

export interface LiveWorkflow {
  readonly id: string;
  readonly user_id: number;
  readonly is_active: boolean;
  readonly title: string;
  readonly description: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly workflow_host_data: {
    readonly id: string | null;
    readonly type: string;
  };
  readonly workflow_blocks: {
    readonly workflowNodeId: number;
    readonly blockReferenceId: number;
    readonly title: string;
    readonly kind: string;
  }[];
  readonly workflow_variables: unknown;
  readonly importance: number | null;
  readonly notice_message: string | null;
  readonly template_reference_id: string | null;
}

export interface GetLiveWorkflowsQuery {
  readonly get_live_workflows: LiveWorkflow[];
}

export interface GetLiveWorkflowsQueryVariables {
  readonly hostInstanceId?: string;
  readonly hostType?: 'APP_FEATURE_OBJECT' | 'BOARD' | 'ACCOUNT_LEVEL';
  readonly pagination?: {
    readonly limit?: number;
    readonly lastId?: number;
  };
}
