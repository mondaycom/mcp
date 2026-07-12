export const knowledgeBaseSearchQuery = `
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
