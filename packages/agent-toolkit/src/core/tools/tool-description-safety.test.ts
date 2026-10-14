import { z } from 'zod';
import { createMockApiClient } from './platform-api-tools/test-utils/mock-api-client';
import { allGraphqlApiTools } from './platform-api-tools';
import { allMondayDevTools } from './monday-dev-tools';
import { allMondayAppsTools } from './monday-apps-tools';

/**
 * Characters that are rejected by some MCP clients (e.g. IBM watsonx Orchestrate)
 * as potential injection vectors in tool descriptions.
 * See: https://github.com/mondaycom/mcp/issues/252
 */
const UNSAFE_CHARS_PATTERN = /[;`]/;

function findUnsafeChars(text: string): string[] {
  return [...text].filter((ch) => UNSAFE_CHARS_PATTERN.test(ch));
}

/** Recursively extract all .describe() strings from a Zod schema. */
function extractZodDescriptions(schema: z.ZodTypeAny, path = ''): { path: string; description: string }[] {
  const results: { path: string; description: string }[] = [];

  if (schema.description) {
    results.push({ path: path || '(root)', description: schema.description });
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    for (const [key, value] of Object.entries(shape)) {
      results.push(...extractZodDescriptions(value as z.ZodTypeAny, path ? `${path}.${key}` : key));
    }
  } else if (schema instanceof z.ZodArray) {
    results.push(...extractZodDescriptions(schema.element, `${path}[]`));
  } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    results.push(...extractZodDescriptions(schema.unwrap(), path));
  } else if (schema instanceof z.ZodDefault) {
    results.push(...extractZodDescriptions(schema._def.innerType, path));
  } else if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    const options = schema._def.options as z.ZodTypeAny[];
    options.forEach((opt, i) => {
      results.push(...extractZodDescriptions(opt, `${path}|option${i}`));
    });
  } else if (schema instanceof z.ZodEffects) {
    results.push(...extractZodDescriptions(schema._def.schema, path));
  }

  return results;
}

describe('Tool description safety', () => {
  const { mockApiClient } = createMockApiClient();

  const apiTools = [...allGraphqlApiTools, ...allMondayDevTools].map((ToolClass) => new ToolClass(mockApiClient));
  const appsTools = allMondayAppsTools.map((ToolClass) => new ToolClass('test-token'));
  const allToolInstances = [...apiTools, ...appsTools];

  describe.each(allToolInstances.map((t) => [t.name, t]))('%s', (_name, tool) => {
    it('getDescription() must not contain unsafe characters', () => {
      const description = tool.getDescription();
      const unsafe = findUnsafeChars(description);
      expect(unsafe).toEqual([]);
    });

    it('input schema field descriptions must not contain unsafe characters', () => {
      const inputSchema = tool.getInputSchema();
      if (!inputSchema) return;

      const zodObj = z.object(inputSchema);
      const descriptions = extractZodDescriptions(zodObj);
      const violations = descriptions
        .filter(({ description }) => findUnsafeChars(description).length > 0)
        .map(({ path, description }) => `${path}: "${description}" (found: ${findUnsafeChars(description).join(', ')})`);

      expect(violations).toEqual([]);
    });
  });
});
