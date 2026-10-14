import { gql } from 'graphql-request';

export const askDeveloperDocsQuery = gql`
  query AskDeveloperDocs($query: String!, $retrieval_only: Boolean = true) {
    ask_developer_docs(query: $query, retrieval_only: $retrieval_only) {
      id
      question
      answer
      conversation_id
    }
  }
`;
