import { gql } from 'graphql-request';

export const getNotetakerMeeting = gql`
  query GetMeeting($id: ID!) {
    notetaker {
      meetings(filters: { ids: [$id] }) {
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
          summary
          topics {
            title
            talking_points {
              content
              timestamp
            }
          }
          action_items {
            id
            content
            is_completed
            owner
            due_date
          }
          transcript {
            text
            start_time
            end_time
            speaker
            language
          }
        }
      }
    }
  }
`;
