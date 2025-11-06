import { gql } from 'graphql-request';

// Get item board and its columns (used to discover or create a doc column for item-attached docs)
export const getItemBoard = gql`
  query getItemBoard($itemId: ID!) {
    items(ids: [$itemId]) {
      id
      board {
        id
        columns {
          id
          type
        }
      }
    }
  }
`;

// Create a new monday doc (works for both workspace and board/item locations via CreateDocInput)
export const createDoc = gql`
  mutation createDoc($location: CreateDocInput!) {
    create_doc(location: $location) {
      id
      url
      name
    }
  }
`;

// Add markdown content to an existing monday doc (API version 2025-10)
export const addContentToDocFromMarkdown = gql`
  mutation addContentToDocFromMarkdown($docId: ID!, $markdown: String!, $afterBlockId: String) {
    add_content_to_doc_from_markdown(docId: $docId, markdown: $markdown, afterBlockId: $afterBlockId) {
      success
      block_ids
      error
    }
  }
`;

// Update the name/title of an existing monday doc (API version 2025-10)
export const updateDocName = gql`
  mutation updateDocName($docId: ID!, $name: String!) {
    update_doc_name(docId: $docId, name: $name)
  }
`;

