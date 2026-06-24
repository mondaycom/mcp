import { z } from 'zod';
import {
  UseTemplateStatus,
  UseTemplateStatusQuery,
  UseTemplateStatusQueryVariables,
} from '../../../monday-graphql/generated/graphql/graphql';
import { useTemplateStatus } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const checkTemplateStatusToolSchema = {
  processId: z.string().describe('The process_id returned by use_template.'),
};

export class CheckTemplateStatusTool extends BaseMondayApiTool<typeof checkTemplateStatusToolSchema, never> {
  name = 'check_template_status';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Check Template Status',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      'Check the status of a use_template operation. ' +
      'Poll after calling use_template — wait 5–10 seconds between polls. ' +
      'Status values: PENDING | IN_PROGRESS | COMPLETE | FAILED. ' +
      'Stop polling when status is COMPLETE (boards ready) or FAILED (unrecoverable). ' +
      'Give up after ~5 minutes if neither terminal status is reached. ' +
      'Board IDs are only available once COMPLETE — boards exist but are empty during IN_PROGRESS. ' +
      'Returns null if process_id is invalid or expired (1-hour TTL).'
    );
  }

  getInputSchema(): typeof checkTemplateStatusToolSchema {
    return checkTemplateStatusToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof checkTemplateStatusToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const variables: UseTemplateStatusQueryVariables = { processId: input.processId };

    const res = await this.mondayApi.request<UseTemplateStatusQuery>(useTemplateStatus, variables, {
      versionOverride: '2026-10',
    });
    const status = res.template_installation_status;

    if (!status) {
      return {
        content: {
          status: null,
          message: 'Status not found. The process_id is invalid or has expired.',
        },
      };
    }
    if (status.status === UseTemplateStatus.Complete) {
      return {
        content: {
          status: UseTemplateStatus.Complete,
          board_ids: status.board_ids,
          board_ids_map: status.board_ids_map,
          message: `Template application complete. ${status.board_ids.length} board(s) created.`,
        },
      };
    }
    if (status.status === UseTemplateStatus.Failed) {
      return {
        content: {
          status: UseTemplateStatus.Failed,
          board_ids: [],
          board_ids_map: [],
          message: 'Template application failed. Please try again.',
        },
      };
    }
    if (status.status === UseTemplateStatus.Pending || status.status === UseTemplateStatus.InProgress) {
      return {
        content: {
          status: status.status,
          board_ids: [],
          board_ids_map: [],
          message: `Template application ${status.status === UseTemplateStatus.InProgress ? 'in progress' : 'pending'}. Board IDs will be available once complete.`,
        },
      };
    }
    return {
      content: {
        status: status.status,
        board_ids: [],
        board_ids_map: [],
        message: `Unexpected status: ${status.status}. Poll again or contact support.`,
      },
    };
  }
}
