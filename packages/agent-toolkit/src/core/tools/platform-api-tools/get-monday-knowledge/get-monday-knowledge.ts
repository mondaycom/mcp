import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { knowledgeBaseSearchQuery } from './get-monday-knowledge.graphql';
import { appsDocumentationQuery } from '../../monday-apps-tools/app-development-assistant/get-app-development-context.graphql';

const KIND_DEVELOPER_DOCS = 'developer_docs' as const;
const KIND_GENERAL = 'general' as const;

export const getMondayKnowledgeSchema = {
  query: z.string().describe('The question or topic to search for in the monday.com knowledge base.'),
  kind: z
    .enum([KIND_DEVELOPER_DOCS, KIND_GENERAL])
    .describe(
      'The knowledge domain to search. Use "developer_docs" for questions about the monday.com API — GraphQL queries and mutations, authentication, rate limits, webhooks, schema, and API best practices. Use "general" for questions about using monday.com — features, automations, UI, help center, and settings.',
    ),
};

interface AskDeveloperDocsResponse {
  ask_developer_docs: {
    id?: string;
    question?: string;
    answer: string;
    conversation_id?: string;
  } | null;
}

interface KnowledgeBaseSearchResponse {
  knowledge_base_search: {
    answer?: string | null;
    raw_snippets: Array<{
      id: string;
      title?: string | null;
      text?: string | null;
      url?: string | null;
      distance?: number | null;
      parent_id?: string | null;
    }>;
  } | null;
}

interface KnowledgeSource {
  title: string;
  url: string;
  snippet: string;
}

export class GetMondayKnowledgeTool extends BaseMondayApiTool<typeof getMondayKnowledgeSchema> {
  name = 'get_monday_knowledge';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Monday Knowledge',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Ask a question about monday.com and get an AI-generated answer from the official knowledge base.

Use kind="general" for questions about using monday.com — features, automations, UI, help center, and settings. Returns cited source articles with links.
Use kind="developer_docs" for questions about building apps on monday.com — SDK, CLI, OAuth, manifest, deployment, and API reference.

The kind enum is extensible — more domains (e.g. marketplace, release_notes) may be added in future versions.`;
  }

  getInputSchema() {
    return getMondayKnowledgeSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof getMondayKnowledgeSchema>,
  ): Promise<ToolOutputType<never>> {
    if (input.kind === KIND_DEVELOPER_DOCS) {
      return this.queryDeveloperDocs(input.query);
    }
    return this.queryGeneralKnowledge(input.query);
  }

  private async queryGeneralKnowledge(query: string): Promise<ToolOutputType<never>> {
    const response = await this.mondayApi.request<KnowledgeBaseSearchResponse>(knowledgeBaseSearchQuery, {
      query,
      limit: 5,
    });

    const result = response.knowledge_base_search;
    if (!result?.answer) {
      throw new Error('No answer found in the knowledge base. Try rephrasing your question.');
    }

    const sources: KnowledgeSource[] = (result.raw_snippets ?? [])
      .filter((s) => s.url && s.title)
      .map((s) => ({
        title: s.title!,
        url: s.url!,
        snippet: s.text ?? '',
      }));

    return {
      content: {
        answer: result.answer,
        sources,
        kind: KIND_GENERAL,
      },
    };
  }

  private async queryDeveloperDocs(query: string): Promise<ToolOutputType<never>> {
    const response = await this.mondayApi.request<AskDeveloperDocsResponse>(appsDocumentationQuery, { query });

    const result = response.ask_developer_docs;
    if (!result?.answer) {
      throw new Error('No answer found in developer docs. Try rephrasing your question.');
    }

    return {
      content: {
        answer: result.answer,
        sources: [],
        kind: KIND_DEVELOPER_DOCS,
      },
    };
  }
}
