import { z } from 'zod';
import {
  BoardKind,
  UseTemplateMutation,
  UseTemplateMutationVariables,
} from '../../../monday-graphql/generated/graphql/graphql';
import { useTemplate } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const useTemplateToolSchema = {
  templateId: z.coerce.number().int().positive().describe('The template ID to apply.'),
  destinationWorkspaceId: z.coerce.number().int().positive().optional().describe('Target workspace ID.'),
  destinationName: z.string().optional().describe('Name for the created instance or folder.'),
  boardKind: z
    .nativeEnum(BoardKind)
    .optional()
    .describe('Board kind for created boards (public / private / share). Omit to use the API default.'),
};

export class UseTemplateTool extends BaseMondayApiTool<typeof useTemplateToolSchema, never> {
  name = 'use_template';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Use Template',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      'Apply a monday.com template to create boards in a workspace. ' +
      'Returns a process_id immediately — the operation runs asynchronously and can take 30 seconds to 2+ minutes. ' +
      'Use check_template_status(processId) to poll every 5–10 seconds until status is COMPLETE or FAILED. ' +
      'Stop polling on COMPLETE (boards ready) or FAILED (unrecoverable error). ' +
      'Give up after ~5 minutes if neither terminal status is reached. ' +
      'Boards exist as empty shells until status is COMPLETE.'
    );
  }

  getInputSchema(): typeof useTemplateToolSchema {
    return useTemplateToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof useTemplateToolSchema>): Promise<ToolOutputType<never>> {
    const variables: UseTemplateMutationVariables = {
      templateId: input.templateId,
      destinationWorkspaceId: input.destinationWorkspaceId,
      destinationName: input.destinationName,
      boardKind: input.boardKind,
    };

    const res = await this.mondayApi.request<UseTemplateMutation>(useTemplate, variables);
    const processId = res.use_template?.process_id;

    if (processId == null) {
      return { content: 'Failed to start template application. The request was rejected.' };
    }

    return {
      content:
        `Template application started. Process ID: ${processId}. ` +
        `Poll check_template_status("${processId}") every 5–10 seconds. ` +
        `Stop on COMPLETE (boards ready) or FAILED (unrecoverable). Give up after ~5 minutes.`,
    };
  }
}
