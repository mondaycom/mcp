import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayAppsTool, createMondayAppsAnnotations } from '../base-tool/base-monday-apps-tool';
import { MondayAppsToolCategory } from '../consts/apps.consts';
import { API_ENDPOINTS, HttpMethod } from '../consts/routes.consts';
import { AppDevelopmentContextResponse, getAppDevelopmentContextSchema } from './schemas/assistant-schemas';
import { API_VERSION } from '../../../../utils/version.utils';

// Response types for kapa.ai GraphQL query
interface KapaSourceReference {
  title: string;
  subtitle?: string;
  source_url: string;
}

interface KapaQueryResponse {
  id: string;
  question: string;
  answer: string;
  sources?: KapaSourceReference[];
  conversation_id?: string;
}

interface GraphQLResponse {
  statusCode: number;
  data?: {
    apps_documentation_ai_query: KapaQueryResponse;
  };
  errors?: Array<{ message: string }>;
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
    return `Search monday.com apps documentation using AI-powered semantic search powered by Kapa.ai.

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
  ): Promise<ToolOutputType<AppDevelopmentContextResponse>> {
    if (!input?.query) {
      throw new Error('Query parameter is required. Please provide a specific question or topic to search.');
    }

    const graphqlQuery = `
      query SearchAppsDocumentation($query: String!) {
        apps_documentation_ai_query(query: $query) {
          id
          question
          answer
          sources {
            title
            subtitle
            source_url
          }
          conversation_id
        }
      }
    `;

    const variables = {
      query: input.query,
    };

    try {
      const response = await this.executeApiRequest<GraphQLResponse>(HttpMethod.POST, API_ENDPOINTS.GRAPHQL, {
        data: {
          query: graphqlQuery,
          variables,
        },
        headers: {
          'API-Version': API_VERSION,
        },
      });

      // Handle GraphQL errors
      if (response.errors && response.errors.length > 0) {
        const errorMessages = response.errors.map((e) => e.message).join(', ');
        throw new Error(`Documentation search failed: ${errorMessages}`);
      }

      // Check if we got valid data
      if (!response.data?.apps_documentation_ai_query) {
        throw new Error('No data returned from documentation search. Please try rephrasing your question.');
      }

      const kapaResponse = response.data.apps_documentation_ai_query;

      // Check if the answer is meaningful
      if (!kapaResponse.answer || kapaResponse.answer.trim().length === 0) {
        throw new Error(
          'No relevant documentation found for your query. Please try rephrasing or being more specific.',
        );
      }

      // Format the response
      let content = `## ${kapaResponse.question}\n\n${kapaResponse.answer}`;

      // Add sources if available
      if (kapaResponse.sources && kapaResponse.sources.length > 0) {
        content += '\n\n### 📚 Sources\n';
        kapaResponse.sources.forEach((source, index) => {
          content += `${index + 1}. **[${source.title}](${source.source_url})**`;
          if (source.subtitle) {
            content += ` - ${source.subtitle}`;
          }
          content += '\n';
        });
      }

      return {
        content,
        metadata: {
          statusCode: response.statusCode,
          queryId: kapaResponse.id,
          conversationId: kapaResponse.conversation_id,
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
}
