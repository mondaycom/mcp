import { gql } from 'graphql-request';

export const getNotetakerMeetings = gql`
  query GetMeetings($limit: Int, $cursor: String, $filters: MeetingsFilterInput) {
    notetaker {
      meetings(limit: $limit, cursor: $cursor, filters: $filters) {
        meetings {
          id
          title
          start_time
          end_time
          recording_duration
          access_type
          meeting_link
          participants {
            email
          }
        }
        page_info {
          has_next_page
          cursor
        }
      }
    }
  }
`;
