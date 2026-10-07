import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { CreateUpdateTool, createUpdateToolSchema } from '../create-update-tool/create-update-tool';
import { runWithRateLimitCircuit, ToolValidationError, GRAPHQL_ERROR_CODE } from '../../../../utils';
import { MAX_UPDATES_PER_CALL, CONCURRENCY_LIMIT, RATE_LIMIT_SKIPPED_CODE } from './constants';

type PerUpdateResult =
  | { index: number; error: string; _errorEntry: Record<string, unknown>; [k: string]: unknown }
  | { index: number; [k: string]: unknown };

export const createUpdatesToolSchema = {
  updates: z
    .array(z.object(createUpdateToolSchema))
    .min(1, 'updates must not be empty')
    .max(MAX_UPDATES_PER_CALL, `updates must not exceed ${MAX_UPDATES_PER_CALL} per call`)
    .describe(
      `The updates to post, up to ${MAX_UPDATES_PER_CALL} per call. Each entry posts one update (or reply, via parentId) on one item and returns its own result on success or a raw error message on failure.`,
    ),
};

export class CreateUpdatesTool extends BaseMondayApiTool<typeof createUpdatesToolSchema> {
  name = 'create_updates';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Multiple Updates',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return (
      `Create up to ${MAX_UPDATES_PER_CALL} updates (comments/posts) in a single call. Each entry is independent - it targets its own item, has its own body and mentions, and can reply to an existing update via parentId - so one call can post on many items, or post several replies. ` +
      'Use this instead of calling create_update repeatedly when posting more than one update. Each entry returns its own update_id and item_id on success or a raw error message on failure.'
    );
  }

  getInputSchema(): typeof createUpdatesToolSchema {
    return createUpdatesToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createUpdatesToolSchema>,
  ): Promise<ToolOutputType<never>> {
    this.sessionContext.metadata ??= {};
    this.sessionContext.metadata.items_count = input.updates.length;

    const skipMessage = 'Skipped: a previous update hit the minute rate limit, this update was not attempted';

    const singleTool = new CreateUpdateTool(this.mondayApi);
    const tasks = input.updates.map((update, index) => async (): Promise<PerUpdateResult> => {
      const result = await singleTool.execute(update);
      return { index, ...(result.content as Record<string, unknown>) };
    });

    const raw = await runWithRateLimitCircuit(tasks, {
      limit: CONCURRENCY_LIMIT,
      onSkipped: (index) => ({
        index,
        error: skipMessage,
        _errorEntry: { code: RATE_LIMIT_SKIPPED_CODE, message: skipMessage, path: ['results', index] },
      }),
      onError: (error, index) => ({
        index,
        error: error instanceof Error ? error.message : String(error),
        _errorEntry: extractErrorEntry(error, index),
      }),
    });

    const errors = raw.filter((r) => 'error' in r).map((r) => r._errorEntry);
    const results = raw.map(({ _errorEntry, ...rest }) => rest);
    const total = raw.length;
    const failed = errors.length;

    const content: Record<string, unknown> = {
      summary: { total, created: total - failed, failed },
      is_partial_success: failed > 0 && failed < total,
      results,
    };

    if (errors.length) {
      content.errors = errors;
    }

    return { content };
  }
}

function extractErrorEntry(error: unknown, index: number): Record<string, unknown> {
  if (error instanceof ToolValidationError) {
    return { code: error.code, message: error.message, path: ['results', index] };
  }

  const gqlEntry = (
    error as {
      response?: {
        errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>;
      };
    }
  )?.response?.errors?.[0];
  const rawMessage = error instanceof Error ? error.message : String(error);
  const extensions = gqlEntry?.extensions ?? {};
  return {
    ...extensions,
    code: (extensions.code as string | undefined) ?? GRAPHQL_ERROR_CODE,
    message: gqlEntry?.message ?? rawMessage,
    path: ['results', index],
  };
}
