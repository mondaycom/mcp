import { gql } from 'graphql-request';

export const updateDocName = gql`
  mutation updateDocName($docId: ID!, $name: String!) {
    update_doc_name(docId: $docId, name: $name)
  }
`;

export const addContentToDocFromMarkdown = gql`
  mutation addContentToDocFromMarkdown($docId: ID!, $markdown: String!, $afterBlockId: String) {
    add_content_to_doc_from_markdown(docId: $docId, markdown: $markdown, afterBlockId: $afterBlockId) {
      success
      block_ids
      error
    }
  }
`;

export const getDocByObjectId = gql`
  query getDocByObjectId($objectId: [ID!]) {
    docs(object_ids: $objectId) {
      id
      object_id
    }
  }
`;

// Resolve doc_id → object_id (board ID) when only doc_id is provided
export const getDocById = gql`
  query getDocById($docId: [ID!]) {
    docs(ids: $docId) {
      id
      object_id
    }
  }
`;

// Get a file column and an item from a board (for file upload context)
export const getBoardDataForAsset = gql`
  query getBoardDataForAsset($objectId: ID!) {
    boards(ids: [$objectId]) {
      columns(types: [file]) {
        id
      }
      items_page(limit: 1) {
        items {
          id
        }
      }
    }
  }
`;

// Upload a file to a file column (returns asset ID for use in image blocks)
export const addFileToColumn = gql`
  mutation addFileToColumn($file: File!, $itemId: ID!, $columnId: String!) {
    add_file_to_column(file: $file, item_id: $itemId, column_id: $columnId) {
      id
    }
  }
`;

// Update an existing block's content
export const updateDocBlock = gql`
  mutation updateDocBlock($blockId: String!, $content: JSON!) {
    update_doc_block(block_id: $blockId, content: $content) {
      id
      type
      created_at
    }
  }
`;

// Delete an existing block by ID
export const deleteDocBlock = gql`
  mutation deleteDocBlock($blockId: String!) {
    delete_doc_block(block_id: $blockId) {
      id
    }
  }
`;

// Create one or more blocks in a document
export const createDocBlocks = gql`
  mutation createDocBlocks($docId: ID!, $afterBlockId: String, $blocksInput: [CreateBlockInput!]!) {
    create_doc_blocks(docId: $docId, afterBlockId: $afterBlockId, blocksInput: $blocksInput) {
      id
      type
      parent_block_id
      created_at
      content {
        ... on TextBlockContent {
          delta_format {
            insert {
              text
            }
            attributes {
              bold
              italic
            }
          }
          alignment
          direction
        }
        ... on ListBlockContent {
          delta_format {
            insert {
              text
            }
            attributes {
              bold
              italic
            }
          }
          alignment
          direction
          indentation
        }
        ... on ImageContent {
          public_url
          width
          alignment
        }
        ... on VideoContent {
          url
          width
          alignment
        }
        ... on TableContent {
          cells {
            row_cells {
              block_id
            }
          }
        }
        ... on LayoutContent {
          cells {
            block_id
          }
        }
        ... on NoticeBoxContent {
          theme
          alignment
          direction
        }
        ... on DividerContent {
          alignment
          direction
        }
      }
    }
  }
`;
