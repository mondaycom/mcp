import { gql } from 'graphql-request';

export const getBoardKnowledge = gql`
  query GetBoardKnowledge($boardId: ID!) {
    entity_knowledge(entity_type: BOARD, entity_id: $boardId) {
      summary
      status
      age_seconds
      sections {
        key
        title
        kind
        confidence
        body_markdown
        data_json
      }
    }
  }
`;
