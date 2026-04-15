import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { createSchemaMutationDev } from './create-schema-tool.graphql.dev';

export const createSchemaToolSchema = {
  name: z
    .string()
    .describe(
      'A unique human-readable name for this schema. Must be 3-15 characters, contain only lowercase letters, numbers, and underscores, and include at least one letter.',
    ),
  parentId: z.string().optional().describe('The ID of the parent schema.'),
  description: z.string().optional().describe('The description for this schema.'),
};

export class CreateSchemaTool extends BaseMondayApiTool<typeof createSchemaToolSchema> {
  name = 'create_schema';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Create Schema',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return 'Create a new account-level schema. Schemas define the structure and columns of boards.';
  }

  getInputSchema(): typeof createSchemaToolSchema {
    return createSchemaToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof createSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<{
      create_schema?: { id: string; name?: string | null; description?: string | null; parent_id?: string | null };
    }>(
      createSchemaMutationDev,
      {
        name: input.name,
        parentId: input.parentId,
        description: input.description,
      },
      { versionOverride: 'dev' },
    );

    return {
      content: {
        message: `Schema "${res.create_schema?.name}" successfully created`,
        entity_id: res.create_schema?.id,
        entity_name: res.create_schema?.name,
      },
    };
  }
}
