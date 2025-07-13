import { z } from 'zod';
import { ReadDocsQuery, ReadDocsQueryVariables, DocsOrderBy } from '../../../monday-graphql/generated/graphql';
import { readDocs, exportMarkdownFromDoc } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

export type ExportMarkdownFromDocMutationVariables = {
  docId: string;
  blockIds?: string[];
};

export type ExportMarkdownFromDocMutation = {
  export_markdown_from_doc: {
    success: boolean;
    markdown?: string;
    error?: string;
  };
};

export const readDocToolSchema = {
  ids: z
    .array(z.string())
    .optional()
    .describe(
      'The specific docs to return. In the UI, this is the ID that appears in the top-left corner of the doc when developer mode is activated.',
    ),
  limit: z.number().optional().describe('The number of docs to get. The default is 25.'),
  object_ids: z
    .array(z.string())
    .optional()
    .describe(
      'The unique identifiers of associated boards or objects. In the UI, this is the ID that appears in the URL and the doc column values.',
    ),
  order_by: z
    .nativeEnum(DocsOrderBy)
    .optional()
    .describe(
      'The order in which to retrieve your docs. The default shows created_at with the newest docs listed first. This argument will not be applied if you query docs by specific ids.',
    ),
  page: z.number().optional().describe('The page number to return. Starts at 1.'),
  workspace_ids: z
    .array(z.string())
    .optional()
    .describe('The unique identifiers of the specific workspaces to return.'),
};

export class ReadDocTool extends BaseMondayApiTool<typeof readDocToolSchema> {
  name = 'read_doc';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Read Documents',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get a collection of monday.com documents. Returns an array containing metadata about docs including their content as markdown. Can filter by doc IDs, object IDs, workspace IDs, and supports pagination and ordering.';
  }

  getInputSchema(): typeof readDocToolSchema {
    return readDocToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof readDocToolSchema>): Promise<ToolOutputType<never>> {
    // Validate that at least one filter is provided
    if (!input.ids && !input.object_ids && !input.workspace_ids) {
      return {
        content:
          'Error: You must provide at least one filter: ids, object_ids, or workspace_ids to search for documents.',
      };
    }

    try {
      const variables: ReadDocsQueryVariables = {
        ids: input.ids,
        object_ids: input.object_ids,
        limit: input.limit || 25,
        order_by: input.order_by,
        page: input.page,
        workspace_ids: input.workspace_ids,
      };

      let res = await this.mondayApi.request<ReadDocsQuery>(readDocs, variables);

      // If no results found and ids were provided, try treating the ids as object_ids - sometimes the user inputs ids are actually object_ids
      if ((!res.docs || res.docs.length === 0) && input.ids) {
        const fallbackVariables: ReadDocsQueryVariables = {
          ids: undefined,
          object_ids: input.ids, // Try the provided ids as object_ids
          limit: input.limit || 25,
          order_by: input.order_by,
          page: input.page,
          workspace_ids: input.workspace_ids,
        };

        res = await this.mondayApi.request<ReadDocsQuery>(readDocs, fallbackVariables);
      }

      if (!res.docs || res.docs.length === 0) {
        return {
          content: 'No documents found matching the specified criteria.',
        };
      }

      return await this.formatDocResponse(res.docs);
    } catch (error) {
      return {
        content: `Error reading documents: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      };
    }
  }

  private async formatDocResponse(docs: NonNullable<ReadDocsQuery['docs']>): Promise<ToolOutputType<never>> {
    const docsInfo = await Promise.all(
      docs.map(async (doc) => {
        if (!doc) return null;

        // Get markdown content for this doc
        let blocks_as_markdown = '';
        try {
          const markdownVariables: ExportMarkdownFromDocMutationVariables = {
            docId: doc.id,
          };

          const markdownRes = await this.mondayApi.request<ExportMarkdownFromDocMutation>(
            exportMarkdownFromDoc,
            markdownVariables,
          );

          if (markdownRes.export_markdown_from_doc.success && markdownRes.export_markdown_from_doc.markdown) {
            blocks_as_markdown = markdownRes.export_markdown_from_doc.markdown;
          } else {
            blocks_as_markdown = `Error getting markdown: ${markdownRes.export_markdown_from_doc.error || 'Unknown error'}`;
          }
        } catch (error) {
          blocks_as_markdown = `Error getting markdown: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        return {
          id: doc.id,
          object_id: doc.object_id,
          name: doc.name,
          doc_kind: doc.doc_kind,
          created_at: doc.created_at,
          created_by: doc.created_by?.name || 'Unknown',
          url: doc.url,
          relative_url: doc.relative_url,
          workspace: doc.workspace?.name || 'Main workspace',
          workspace_id: doc.workspace_id,
          doc_folder_id: doc.doc_folder_id,
          settings: doc.settings,
          blocks_as_markdown,
        };
      }),
    );

    const filteredDocsInfo = docsInfo.filter(Boolean);

    return {
      content: `Successfully retrieved ${filteredDocsInfo.length} document(s):\n\n${JSON.stringify(filteredDocsInfo, null, 2)}`,
    };
  }
}
