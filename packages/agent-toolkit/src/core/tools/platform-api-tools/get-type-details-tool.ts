import { z } from 'zod';
import { GetTypeDetailsQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { generateTypeDetailsQuery } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export const getTypeDetailsToolSchema = {
  typeName: z.string().describe('The name of the GraphQL type to get details for'),
};

export class GetTypeDetailsTool extends BaseMondayApiTool<typeof getTypeDetailsToolSchema> {
  name = 'get_type_details';
  type = ToolType.ALL_API;
  annotations = createMondayApiAnnotations({
    title: 'Get Type Details',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get detailed information about a specific GraphQL type from the monday.com API schema';
  }

  getInputSchema(): typeof getTypeDetailsToolSchema {
    return getTypeDetailsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getTypeDetailsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    try {
      if (!input.typeName) {
        return {
          content: 'Error: typeName is required. Please provide a valid GraphQL type name.',
        };
      }

      // Generate query with hardcoded type name - it cant be a variable due to a bug in the API so must be generated string.
      const query = generateTypeDetailsQuery(input.typeName);

      const res = await this.mondayApi.request<GetTypeDetailsQuery>(query);

      if (!res.__type) {
        return {
          content: `Type '${input.typeName}' not found in the GraphQL schema. Please check the type name and try again.`,
        };
      }

      return {
        content: {
          message: 'Type details retrieved',
          data: {
            name: res.__type.name,
            kind: res.__type.kind,
            description: res.__type.description ?? null,
            fields: res.__type.fields ?? [],
            inputFields: res.__type.inputFields ?? [],
            interfaces: res.__type.interfaces ?? [],
            enumValues: res.__type.enumValues ?? [],
            possibleTypes: res.__type.possibleTypes ?? [],
          },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isJsonError = errorMessage.includes('JSON');

      return {
        content: `Error fetching type details: ${errorMessage}${
          isJsonError
            ? '\n\nThis could be because the type name is incorrect or the GraphQL query format is invalid. Please check the type name and try again.'
            : ''
        }`,
      };
    }
  }
}
