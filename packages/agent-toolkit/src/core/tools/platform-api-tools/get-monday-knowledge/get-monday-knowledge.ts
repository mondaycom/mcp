import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from 'src/core/tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { rethrowWithContext } from 'src/utils/error.utils';
import { knowledgeBaseSearchQuery, askDeveloperDocsQuery } from './get-monday-knowledge.graphql';
import {
  KnowledgeBaseSearchQuery,
  KnowledgeBaseSearchQueryVariables,
  AskDeveloperDocsQuery,
  AskDeveloperDocsQueryVariables,
} from 'src/monday-graphql/generated/graphql/graphql';

const KIND_DEVELOPER_DOCS = 'developer_docs' as const;
const KIND_GENERAL = 'general' as const;

export const getMondayKnowledgeSchema = {
  query: z.string().describe('The question or topic to search for in the monday.com knowledge base.'),
  kind: z
    .enum([KIND_DEVELOPER_DOCS, KIND_GENERAL])
    .describe(
      'The knowledge domain to search. Use "developer_docs" for questions about the monday.com API — GraphQL queries and mutations, authentication, rate limits, webhooks, schema, API best practices, and building apps. Use "general" for questions about using monday.com — features, automations, UI, help center, and settings.',
    ),
};

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
Use kind="developer_docs" for questions about the monday.com API — GraphQL queries and mutations, authentication, rate limits, webhooks, schema, API best practices, and building apps.`;
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
    const variables: KnowledgeBaseSearchQueryVariables = { query };
    const response = await this.mondayApi.request<KnowledgeBaseSearchQuery>(knowledgeBaseSearchQuery, variables);

    const result = response.knowledge_base_search;
    if (!result?.answer) {
      rethrowWithContext(new Error('No answer found in the knowledge base. Try rephrasing your question.'), 'get_monday_knowledge');
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
    const variables: AskDeveloperDocsQueryVariables = { query };
    const response = await this.mondayApi.request<AskDeveloperDocsQuery>(askDeveloperDocsQuery, variables);

    const result = response.ask_developer_docs;
    if (!result?.answer) {
      rethrowWithContext(new Error('No answer found in developer docs. Try rephrasing your question.'), 'get_monday_knowledge');
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
