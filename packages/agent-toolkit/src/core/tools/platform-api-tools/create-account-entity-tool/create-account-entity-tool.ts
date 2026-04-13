import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { createAccountEntityMutationDev } from './create-account-entity-tool.graphql.dev';

export const createAccountEntityToolSchema = {
  name: z
    .string()
    .describe(
      'A unique human-readable name for this entity. Must be 3-15 characters, contain only lowercase letters, numbers, and underscores, and include at least one letter.',
    ),
  parentId: z.string().optional().describe('The ID of the parent entity.'),
  description: z.string().optional().describe('The description for this entity.'),
};

export class CreateAccountEntityTool extends BaseMondayApiTool<typeof createAccountEntityToolSchema, never> {
  name = 'create_account_entity';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Account Entity',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new account-level entity model. Entity models define the structure and columns of boards.';
  }

  getInputSchema(): typeof createAccountEntityToolSchema {
    return createAccountEntityToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createAccountEntityToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<{
      create_account_entity?: { id: string; name?: string | null; description?: string | null; parent_id?: string | null };
    }>(
      createAccountEntityMutationDev,
      {
        name: input.name,
        parentId: input.parentId,
        description: input.description,
      },
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Account entity "${res.create_account_entity?.name}" successfully created`,
        entity_id: res.create_account_entity?.id,
        entity_name: res.create_account_entity?.name,
      },
    };
  }
}
