import { z } from 'zod';
import { GetTypeDetailsQuery } from '../../../monday-graphql/generated/graphql';
import { generateTypeDetailsQuery } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool } from './base-monday-api-tool';

export const getTypeDetailsToolSchema = {
  typeName: z.string().describe('The name of the GraphQL type to get details for'),
};

export class GetTypeDetailsTool extends BaseMondayApiTool<typeof getTypeDetailsToolSchema> {
  name = 'get_type_details';
  type = ToolType.ALL_API;

  getDescription(): string {
    return 'Get detailed information about a specific GraphQL type from the Monday.com API schema';
  }

  getInputSchema(): typeof getTypeDetailsToolSchema {
    return getTypeDetailsToolSchema;
  }

  async execute(input: ToolInputType<typeof getTypeDetailsToolSchema>): Promise<ToolOutputType<never>> {
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

      let formattedResponse = `## Type: ${res.__type.name || 'Unnamed'} ${input.typeName === res.__type.name ? '' : `(queried: ${input.typeName})`}
Kind: ${res.__type.kind}
${res.__type.description ? `Description: ${res.__type.description}` : ''}

`;

      // Format fields
      if (res.__type.fields && res.__type.fields.length > 0) {
        formattedResponse += `## Fields\n`;
        res.__type.fields.forEach((field) => {
          const typeName = formatTypeName(field.type);
          formattedResponse += `- ${field.name}: ${typeName}${field.description ? ` - ${field.description}` : ''}\n`;

          // If field has arguments, list them
          if (field.args && field.args.length > 0) {
            formattedResponse += `  Arguments:\n`;
            field.args.forEach((arg) => {
              const argTypeName = formatTypeName(arg.type);
              formattedResponse += `  - ${arg.name}: ${argTypeName}${arg.description ? ` - ${arg.description}` : ''}${arg.defaultValue ? ` (default: ${arg.defaultValue})` : ''}\n`;
            });
          }
        });
        formattedResponse += '\n';
      }

      // Format input fields
      if (res.__type.inputFields && res.__type.inputFields.length > 0) {
        formattedResponse += `## Input Fields\n`;
        res.__type.inputFields.forEach((field) => {
          const typeName = formatTypeName(field.type);
          formattedResponse += `- ${field.name}: ${typeName}${field.description ? ` - ${field.description}` : ''}${field.defaultValue ? ` (default: ${field.defaultValue})` : ''}\n`;
        });
        formattedResponse += '\n';
      }

      // Format interfaces
      if (res.__type.interfaces && res.__type.interfaces.length > 0) {
        formattedResponse += `## Implements\n`;
        res.__type.interfaces.forEach((iface) => {
          formattedResponse += `- ${iface.name}\n`;
        });
        formattedResponse += '\n';
      }

      // Format enum values
      if (res.__type.enumValues && res.__type.enumValues.length > 0) {
        formattedResponse += `## Enum Values\n`;
        res.__type.enumValues.forEach((value) => {
          formattedResponse += `- ${value.name}${value.description ? ` - ${value.description}` : ''}\n`;
        });
        formattedResponse += '\n';
      }

      // Format possible types (for interfaces and unions)
      if (res.__type.possibleTypes && res.__type.possibleTypes.length > 0) {
        formattedResponse += `## Possible Types\n`;
        res.__type.possibleTypes.forEach((type) => {
          formattedResponse += `- ${type.name}\n`;
        });
      }

      // Add usage examples
      formattedResponse += `
## Usage Examples
If this is a Query or Mutation field, you can use it in the all_monday_api tool.

Example for query:
all_monday_api(operation: "query", name: "getTypeData", variables: "{\\"typeName\\": \\"${res.__type.name}\\"}")

Example for object field access:
When querying objects that have this type, include these fields in your query.
`;

      return {
        content: formattedResponse,
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

// Helper function to format type names
function formatTypeName(type: any): string {
  if (!type) return 'unknown';

  if (type.kind === 'NON_NULL') {
    return `${formatTypeName(type.ofType)}!`;
  }

  if (type.kind === 'LIST') {
    return `[${formatTypeName(type.ofType)}]`;
  }

  return type.name || 'unknown';
}
