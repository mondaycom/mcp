import { WorkflowAutomation } from '../../../../monday-graphql/generated/graphql.dev/graphql';

export interface WorkflowStepReadModel {
  readonly node_id: string | null;
  readonly block_reference_id: string | null;
  readonly title: string | null;
}

export interface WorkflowReadModel {
  readonly id: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly created_at: string | null;
  readonly updated_at: string | null;
  readonly steps: WorkflowStepReadModel[];
}

// Shared shape so get_workflow and list_workflows return identical workflow objects.
export function toWorkflowReadModel(workflow: WorkflowAutomation): WorkflowReadModel {
  return {
    id: workflow.id ?? null,
    title: workflow.title ?? null,
    description: workflow.description ?? null,
    active: workflow.active ?? false,
    created_at: workflow.created_at ?? null,
    updated_at: workflow.updated_at ?? null,
    steps: (workflow.steps ?? []).map((step) => ({
      node_id: step.node_id ?? null,
      block_reference_id: step.block_reference_id ?? null,
      title: step.title ?? null,
    })),
  };
}
