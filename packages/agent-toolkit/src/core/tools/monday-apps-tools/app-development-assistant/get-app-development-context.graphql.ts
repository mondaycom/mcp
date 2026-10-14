export const appsDocumentationQuery = `
  query AskDeveloperDocs($query: String!) {
    ask_developer_docs(query: $query) {
      id
      question
      answer
      conversation_id
    }
  }
`;
