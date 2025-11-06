import { z } from 'zod';
import { ReadDocsQuery, ReadDocsQueryVariables, DocsOrderBy } from '../../../monday-graphql/generated/graphql';
import { readDocs, exportMarkdownFromDoc } from '../../../monday-graphql/queries.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from './base-monday-api-tool';

// Filter type enum
const QueryByIdEnum = z.enum(['ids', 'object_ids', 'workspace_ids']);

export const readDocsToolSchema = {
  type: QueryByIdEnum.describe('Query type of ids parameter that is used query by: ids, object_ids, or workspace_ids'),
  ids: z.array(z.string()).min(1).describe('Array of ID values for this query type (at least 1 required)'),
  limit: z
    .number()
    .optional()
    .describe(
      'Number of docs per page (default: 25). Affects pagination - if you get exactly this many results, there may be more pages.',
    ),
  order_by: z
    .nativeEnum(DocsOrderBy)
    .optional()
    .describe(
      'The order in which to retrieve your docs. The default shows created_at with the newest docs listed first. This argument will not be applied if you query docs by specific ids.',
    ),
  page: z
    .number()
    .optional()
    .describe(
      'The page number to return (starts at 1). Use this to paginate through large result sets. Check response for has_more_pages indicator.',
    ),
};

export class ReadDocsTool extends BaseMondayApiTool<typeof readDocsToolSchema> {
  name = 'read_docs';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Read Documents',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get a collection of monday.com documents with their content as markdown. 

PAGINATION: 
- Default limit is 25 documents per page
- Use 'page' parameter to get additional pages (starts at 1)
- Check response for 'has_more_pages' to know if you should continue paginating
- If user asks for "all documents" and you get exactly 25 results, continue with page 2, 3, etc.

FILTERING: Provide a type value and array of ids:
- type: 'ids' for specific document IDs
- type: 'object_ids' for specific document object IDs  
- type: 'workspace_ids' for all docs in specific workspaces
- ids: array of ID strings (at least 1 required)

Examples:
- { type: 'ids', ids: ['123', '456'] }
- { type: 'object_ids', ids: ['123'] }
- { type: 'workspace_ids', ids: ['ws_101'] }

USAGE PATTERNS:
- For specific documents: use type 'ids' or 'object_ids' (A monday doc has two unique identifiers)
- For workspace exploration: use type 'workspace_ids' with pagination
- For large searches: start with page 1, then paginate if has_more_pages=true`;
  }

  getInputSchema(): typeof readDocsToolSchema {
    return readDocsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof readDocsToolSchema>): Promise<ToolOutputType<never>> {
    try {
      // Extract ID values by type (now it's a single object, not an array)
      let ids: string[] | undefined;
      let object_ids: string[] | undefined;
      let workspace_ids: string[] | undefined;

      switch (input.type) {
        case 'ids':
          ids = input.ids;
          break;
        case 'object_ids':
          object_ids = input.ids;
          break;
        case 'workspace_ids':
          workspace_ids = input.ids;
          break;
      }

      const variables: ReadDocsQueryVariables = {
        ids,
        object_ids,
        limit: input.limit || 25,
        order_by: input.order_by,
        page: input.page,
        workspace_ids,
      };

      let res = await this.mondayApi.request<ReadDocsQuery>(readDocs, variables);

      // If no results found and ids were provided, try treating the ids as object_ids - sometimes the user inputs ids are actually object_ids
      if ((!res.docs || res.docs.length === 0) && ids) {
        const fallbackVariables: ReadDocsQueryVariables = {
          ids: undefined,
          object_ids: ids, // Try the provided ids as object_ids
          limit: input.limit || 25,
          order_by: input.order_by,
          page: input.page,
          workspace_ids,
        };

        res = await this.mondayApi.request<ReadDocsQuery>(readDocs, fallbackVariables);
      }

      if (!res.docs || res.docs.length === 0) {
        const pageInfo = input.page ? ` (page ${input.page})` : '';
        return {
          content: `No documents found matching the specified criteria${pageInfo}.`,
        };
      }

      const result = await this.enrichDocsWithMarkdown(res.docs, variables);

      // Add pagination suggestion
      const paginationSuggestion = this.shouldSuggestPagination(
        res.docs.length,
        variables.limit || 25,
        variables.page || 1,
      );

      return {
        content: result.content + paginationSuggestion,
      };
    } catch (error) {
      return {
        content: `Error reading documents: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
      };
    }
  }

  // Helper method to determine if the agent should continue paginating
  private shouldSuggestPagination(docsCount: number, limit: number, currentPage: number): string {
    if (docsCount === limit) {
      return `\n\n🔄 PAGINATION SUGGESTION: You received exactly ${limit} documents, which suggests there may be more. Consider calling this tool again with page: ${currentPage + 1} to get additional documents.`;
    }
    return '';
  }

  // Convert docs content to markdown string with pagination metadata
  private async enrichDocsWithMarkdown(
    docs: NonNullable<ReadDocsQuery['docs']>,
    variables: ReadDocsQueryVariables,
  ): Promise<ToolOutputType<never>> {
    type ExportMarkdownFromDocMutationVariables = {
      docId: string;
      blockIds?: string[];
    };

    type ExportMarkdownFromDocMutation = {
      export_markdown_from_doc: {
        success: boolean;
        markdown?: string;
        error?: string;
      };
    };

    const docsInfo = await Promise.all(
      docs
        .filter((doc): doc is NonNullable<typeof doc> => doc !== null)
        .map(async (doc) => {
          // Get markdown content for this doc
          let blocksAsMarkdown = '';
          try {
            const markdownVariables: ExportMarkdownFromDocMutationVariables = {
              docId: doc.id,
            };

            const markdownRes = await this.mondayApi.request<ExportMarkdownFromDocMutation>(
              exportMarkdownFromDoc,
              markdownVariables,
            );

            if (markdownRes.export_markdown_from_doc.success && markdownRes.export_markdown_from_doc.markdown) {
              blocksAsMarkdown = markdownRes.export_markdown_from_doc.markdown;
            } else {
              blocksAsMarkdown = `Error getting markdown: ${markdownRes.export_markdown_from_doc.error || 'Unknown error'}`;
            }
          } catch (error) {
            blocksAsMarkdown = `Error getting markdown: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
            workspace: doc.workspace?.name || 'Unknown',
            workspace_id: doc.workspace_id,
            doc_folder_id: doc.doc_folder_id,
            settings: doc.settings,
            blocks_as_markdown: blocksAsMarkdown,
          };
        }),
    );

    const currentPage = variables.page || 1;
    const limit = variables.limit || 25;
    const docsCount = docsInfo.length;
    const hasMorePages = docsCount === limit; // If we got exactly the limit, there might be more

    return {
      content: `Successfully retrieved ${docsInfo.length} document${docsInfo.length === 1 ? '' : 's'}.

PAGINATION INFO:
- Current page: ${currentPage}
- Documents per page: ${limit}
- Documents in this response: ${docsCount}
- Has more pages: ${hasMorePages ? 'YES - call again with page: ' + (currentPage + 1) : 'NO'}

DOCUMENTS:
${JSON.stringify(docsInfo, null, 2)}`,
    };
  }
}
