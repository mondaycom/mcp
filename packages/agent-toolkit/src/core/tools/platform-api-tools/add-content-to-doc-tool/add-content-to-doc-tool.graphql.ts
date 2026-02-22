import { gql } from 'graphql-request';

// Add markdown content to an existing monday doc
export const addContentToDocFromMarkdown = gql`
  mutation addContentToDocFromMarkdown($docId: ID!, $markdown: String!, $afterBlockId: String) {
    add_content_to_doc_from_markdown(docId: $docId, markdown: $markdown, afterBlockId: $afterBlockId) {
      success
      block_ids
      error
    }
  }
`;

// Lightweight query to resolve object_id to doc id
export const getDocByObjectId = gql`
  query getDocByObjectId($objectId: [ID!]) {
    docs(object_ids: $objectId) {
      id
    }
  }
`;
