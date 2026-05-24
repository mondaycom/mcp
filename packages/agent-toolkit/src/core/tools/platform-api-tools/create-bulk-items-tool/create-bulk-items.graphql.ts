import { gql } from 'graphql-request';

export const ingestItemsMutation = gql`
  mutation IngestItems($boardId: ID!, $onMatch: OnMatchInput) {
    ingest_items(board_id: $boardId, on_match: $onMatch) {
      job_id
      status
      s3_url
    }
  }
`;

export const fetchJobStatusQuery = gql`
  query PollJob($jobId: ID!) {
    fetch_job_status(job_id: $jobId) {
      ... on ItemsJobStatus {
        status
        progress_percentage
        fully_imported
        counts {
          submitted
          invalid
          skipped
          created
          updated
          failed
        }
        failure_reason
        failure_message
      }
    }
  }
`;
