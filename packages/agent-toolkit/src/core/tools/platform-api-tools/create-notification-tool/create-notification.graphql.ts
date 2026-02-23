import { gql } from 'graphql-request';

export const createNotification = gql`
  mutation createNotification($user_id: ID!, $target_id: ID!, $text: String!, $target_type: NotificationTargetType!) {
    create_notification(user_id: $user_id, target_id: $target_id, text: $text, target_type: $target_type) {
      text
    }
  }
`;
