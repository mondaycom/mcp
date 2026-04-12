import { gql } from 'graphql-request';

// Create one or more blocks in a document (dev-only mutation)
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
