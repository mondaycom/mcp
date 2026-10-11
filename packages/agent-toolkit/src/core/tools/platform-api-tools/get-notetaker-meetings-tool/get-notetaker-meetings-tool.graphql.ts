import { gql } from 'graphql-request';

export const getNotetakerMeetings = gql`
  query GetNotetakerMeetings(
    $limit: Int
    $cursor: String
    $filters: MeetingsFilterInput
    $includeSummary: Boolean!
    $includeTopics: Boolean!
    $includeActionItems: Boolean!
    $includeTranscript: Boolean!
  ) {
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
          summary @include(if: $includeSummary)
          topics @include(if: $includeTopics) {
            title
            talking_points {
              content
              timestamp
            }
          }
          action_items @include(if: $includeActionItems) {
            id
            content
            is_completed
            owner
            due_date
          }
          transcript @include(if: $includeTranscript) {
            text
            start_time
            end_time
            speaker
            language
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
