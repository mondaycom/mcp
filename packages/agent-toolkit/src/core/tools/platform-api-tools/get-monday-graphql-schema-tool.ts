import { ToolOutputType, ToolType, ToolInputType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';
import { z } from 'zod';

export const getMondayGraphQLSchemaToolSchema = {
  random_string: z.string().describe('Dummy parameter for no-parameter tools').optional(),
};

export class GetMondayGraphQLSchemaTool extends BaseMondayApiTool<typeof getMondayGraphQLSchemaToolSchema> {
  name = 'get_monday_graphql_schema';
  type = ToolType.ALL_API;
  annotations = createMondayApiAnnotations({
    title: 'Get Monday GraphQL Schema',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Fetch the complete Monday.com GraphQL Schema Definition Language (SDL) from the public API endpoint. This returns the raw SDL schema which includes all types, queries, mutations, and their complete definitions in GraphQL SDL format.';
  }

  getInputSchema(): typeof getMondayGraphQLSchemaToolSchema {
    return getMondayGraphQLSchemaToolSchema;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getMondayGraphQLSchemaToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      const apiVersion = this.mondayApi.apiVersion;
      const sdlUrl = `https://api.monday.com/v2/get_schema?version=${apiVersion}&format=sdl`;

      const response = await fetch(sdlUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Monday-Agent-Toolkit',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const sdlContent = await response.text();

      if (!sdlContent || sdlContent.trim().length === 0) {
        throw new Error('Received empty SDL content from the API');
      }

      return {
        content: `# Monday.com GraphQL SDL Schema\n\nHere is the complete GraphQL Schema Definition Language (SDL) for Monday.com's public API:\n\n\`\`\`graphql\n${sdlContent}\n\`\`\`\n\nThis SDL contains all available types, queries, mutations, and their complete definitions. You can use this schema to understand the structure of the Monday.com GraphQL API and construct proper queries and mutations.`,
      };
    } catch (error) {
      return {
        content: `Error fetching Monday GraphQL SDL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
