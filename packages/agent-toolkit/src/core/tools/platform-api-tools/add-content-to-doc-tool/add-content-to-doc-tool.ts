import { z } from 'zod';

import { addContentToDocFromMarkdown, getDocByObjectId } from './add-content-to-doc-tool.graphql';

import {
  AddContentToDocFromMarkdownMutation,
  AddContentToDocFromMarkdownMutationVariables,
} from '../../../../monday-graphql/generated/graphql/graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';

type GetDocByObjectIdQuery = {
  docs?: Array<{ id: string } | null> | null;
};

export const addContentToDocToolSchema = {
  doc_id: z
    .string()
    .min(1)
    .optional()
    .describe('The internal document ID. Provide this OR object_id (doc_id takes priority if both are provided).'),
  object_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The external object ID of the document. Will be resolved to an internal doc_id. Provide this OR doc_id.',
    ),
  markdown: z.string().describe('Markdown content to add to the document.'),
  after_block_id: z
    .string()
    .optional()
    .describe('Optional block ID after which to insert the new content. If omitted, content is appended at the end.'),
};

export class AddContentToDocTool extends BaseMondayApiTool<typeof addContentToDocToolSchema> {
  name = 'add_content_to_doc';
  type = ToolType.WRITE;
  annotations = createMondayApiAnnotations({
    title: 'Add Content to Document',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  });

  getDescription(): string {
    return `Add markdown content to an existing monday.com document.

IDENTIFICATION: Provide either doc_id or object_id to identify the document:
- doc_id: The internal document ID (takes priority if both provided)
- object_id: The external object ID, which will be resolved to a doc_id

USAGE EXAMPLES:
- By doc_id: { doc_id: "123", markdown: "# New Section\\nContent here" }
- By object_id: { object_id: "456", markdown: "# New Section\\nContent here" }
- Insert after block: { doc_id: "123", markdown: "Inserted content", after_block_id: "block_789" }`;
  }

  getInputSchema(): typeof addContentToDocToolSchema {
    return addContentToDocToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof addContentToDocToolSchema>,
  ): Promise<ToolOutputType<never>> {
    if (!input.doc_id && !input.object_id) {
      return { content: 'Error: Either doc_id or object_id must be provided.' };
    }

    try {
      let docId = input.doc_id;

      // Resolve object_id to doc_id if needed
      if (!docId) {
        const res = await this.mondayApi.request<GetDocByObjectIdQuery>(getDocByObjectId, {
          objectId: [input.object_id],
        });

        const doc = res.docs?.[0];
        if (!doc) {
          return { content: `Error: No document found for object_id ${input.object_id}.` };
        }
        docId = doc.id;
      }

      const variables: AddContentToDocFromMarkdownMutationVariables = {
        docId,
        markdown: input.markdown,
        afterBlockId: input.after_block_id,
      };

      const result = await this.mondayApi.request<AddContentToDocFromMarkdownMutation>(
        addContentToDocFromMarkdown,
        variables,
      );

      if (!result?.add_content_to_doc_from_markdown) {
        return { content: 'Error: Failed to add content to document — no response from API.' };
      }

      const { success, block_ids, error } = result.add_content_to_doc_from_markdown;

      if (!success) {
        return { content: `Error adding content to document: ${error || 'Unknown error'}` };
      }

      const blockCount = block_ids?.length ?? 0;
      return {
        content: `Successfully added content to document ${docId}. ${blockCount} block${blockCount === 1 ? '' : 's'} created.${block_ids && block_ids.length > 0 ? ` Block IDs: ${block_ids.join(', ')}` : ''}`,
      };
    } catch (error) {
      return {
        content: `Error adding content to document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
