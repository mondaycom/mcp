import { gql } from 'graphql-request';

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
