import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { AppDevelopmentContextResponse, getAppDevelopmentContextSchema } from './schemas/assistant-schemas';
import { appsDocumentationQuery } from './get-app-development-context.graphql';
  import { APP_DEVELOPMENT_SYSTEM_PROMPT } from './prompts/app-development-system-prompt';

interface AskDeveloperDocsResponse {
  ask_developer_docs: {
    id?: string;
    question?: string;
    answer: string;
    conversation_id?: string;
  } | null;
}

export class GetAppDevelopmentContextTool extends BaseMondayAppsTool<
  typeof getAppDevelopmentContextSchema.shape,
  AppDevelopmentContextResponse
> {
  name = 'monday_apps_get_development_context';
  category = MondayAppsToolCategory.APP_DEVELOPMENT_ASSISTANT;
  type: ToolType = ToolType.READ;
  annotations = createMondayAppsAnnotations({
    title: 'Get App Development Context',
    readOnlyHint: true,
  });

  getDescription(): string {
    return `Your primary source of truth for building apps on top of monday.com. Call this tool whenever you need guidance on app development — from understanding the platform and its capabilities, to writing code, deploying, configuring permissions, and following best practices.

[REQUIRED]: Call this tool BEFORE implementing any monday.com app feature or performing any app-related action.

This tool returns development guidelines and dynamic documentation answers from the official monday.com apps knowledge base. It covers everything you need to build, deploy, and manage monday.com apps — including SDK usage, CLI commands, feature types, deployment procedures, OAuth scopes, manifest configuration, and troubleshooting.

Provide a clear question or topic in the query parameter for best results.`;
  }

  getInputSchema() {
    return getAppDevelopmentContextSchema.shape;
  }

  protected async executeInternal(
    input?: ToolInputType<typeof getAppDevelopmentContextSchema.shape>,
  ): Promise<ToolOutputType<AppDevelopmentContextResponse>> {
    if (!input?.query) {
      throw new Error('Query parameter is required. Please provide a specific question or topic to search.');
    }

    try {
      const variables = {
        query: input.query,
      };

      const response = await this.executeGraphQLQuery<AskDeveloperDocsResponse>(appsDocumentationQuery, variables);

      const docsResponse = response.ask_developer_docs;
      if (!docsResponse) {
        throw new Error('No data returned from documentation search. Please try rephrasing your question.');
      }

      if (!docsResponse.answer || docsResponse.answer.trim().length === 0) {
        throw new Error(
          'No relevant documentation found for your query. Please try rephrasing or being more specific.',
        );
      }

      const content = this.buildStructuredResponse(docsResponse);

      return {
        content,
        metadata: {
          statusCode: 200,
          queryId: docsResponse.id,
          conversationId: docsResponse.conversation_id,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: `Failed to search documentation: ${errorMessage}`,
        metadata: {
          statusCode: 500,
          error: errorMessage,
        },
      };
    }
  }

  private buildStructuredResponse(docsResponse: NonNullable<AskDeveloperDocsResponse['ask_developer_docs']>): string {
    const sections: string[] = [];

    sections.push(APP_DEVELOPMENT_SYSTEM_PROMPT);
    sections.push('---');

    const questionHeader = docsResponse.question ? `## ${docsResponse.question}` : '## Documentation Response';
    sections.push(`${questionHeader}\n\n${docsResponse.answer}`);

    return sections.join('\n\n');
  }
}
