import { gql } from 'graphql-request';

export const getDocVersionHistory = gql`
  query GetDocVersionHistory($docId: ID!, $since: String, $until: String) {
    doc_version_history(doc_id: $docId, since: $since, until: $until) {
      doc_id
      restoring_points {
        date
        user_ids
        type
      }
    }
  }
`;

export const getDocVersionDiff = gql`
  query GetDocVersionDiff($docId: ID!, $date: String!, $prevDate: String!) {
    doc_version_diff(doc_id: $docId, date: $date, prev_date: $prevDate) {
      doc_id
      blocks {
        id
        type
        summary
        changes {
          added
          deleted
          changed
        }
      }
    }
  }
`;
