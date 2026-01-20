import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import {
  BaseMondayApiTool,
  createMondayApiAnnotations,
} from '../../platform-api-tools/base-monday-api-tool';
import { getAppDevelopmentContextSchema } from './schemas/assistant-schemas';
import { appsDocumentationQuery } from './get-app-development-context.graphql';

interface AskDeveloperDocsResponse {
  ask_developer_docs: {
    id?: string;
    question?: string;
    answer: string;
    conversation_id?: string;
  } | null;
}

export class GetAppDevelopmentContextTool extends BaseMondayApiTool<
  typeof getAppDevelopmentContextSchema.shape,
  never
> {
  name = 'monday_apps_get_development_context';
  type: ToolType = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get App Development Context',
    readOnlyHint: true,
  });

  getDescription(): string {
    return `Search monday.com apps documentation using AI-powered semantic search.

This tool provides accurate, contextual answers about:
- Building app features (board views, item views, dashboard widgets, custom columns)
- OAuth scopes and permissions (boards:read, boards:write, users:read, etc.)
- monday.com SDK reference and usage examples
- monday-code deployment and integration
- Vibe Design System components and styling
- Workflow blocks, custom triggers, and automation actions
- Custom objects and data schemas
- Best practices, troubleshooting, and common patterns

Use this when you need specific information from the official monday.com apps documentation.
Provide a clear question or topic in the query parameter for best results.`;
  }

  getInputSchema() {
    return getAppDevelopmentContextSchema.shape;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getAppDevelopmentContextSchema.shape>,
  ): Promise<ToolOutputType<never>> {
    if (!input?.query) {
      throw new Error('Query parameter is required. Please provide a specific question or topic to search.');
    }

    try {
      const variables = {
        query: input.query,
      };

      const response = await this.mondayApi.request<AskDeveloperDocsResponse>(appsDocumentationQuery, variables);

      const docsResponse = response.ask_developer_docs;
      if (!docsResponse) {
        throw new Error('No data returned from documentation search. Please try rephrasing your question.');
      }

      // Check if the answer is meaningful
      if (!docsResponse.answer || docsResponse.answer.trim().length === 0) {
        throw new Error(
          'No relevant documentation found for your query. Please try rephrasing or being more specific.',
        );
      }

      // Format the response
      const questionHeader = docsResponse.question ? `## ${docsResponse.question}\n\n` : '## Answer\n\n';
      const content = `${questionHeader}${docsResponse.answer}`;

      return {
        content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to search documentation: ${errorMessage}`,
      };
    }
  }
}
