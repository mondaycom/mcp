import { gql } from 'graphql-request';

export const knowledgeBaseSearchQuery = gql`
  query KnowledgeBaseSearch($query: String!, $limit: Int) {
    knowledge_base_search(query: $query, limit: $limit) {
      answer
      raw_snippets {
        id
        title
        text
        url
        distance
        parent_id
      }
    }
  }
`;

export const askDeveloperDocsQuery = gql`
  query AskDeveloperDocs($query: String!) {
    ask_developer_docs(query: $query) {
      id
      question
      answer
      conversation_id
    }
  }
`;
