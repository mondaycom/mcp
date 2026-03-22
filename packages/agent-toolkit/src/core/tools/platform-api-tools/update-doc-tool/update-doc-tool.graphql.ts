import { gql } from 'graphql-request';

// Reuse from existing tools
export { updateDocName } from '../create-doc-tool/create-doc-tool.graphql';
export {
  addContentToDocFromMarkdown,
  getDocByObjectId,
} from '../add-content-to-doc-tool/add-content-to-doc-tool.graphql';

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
