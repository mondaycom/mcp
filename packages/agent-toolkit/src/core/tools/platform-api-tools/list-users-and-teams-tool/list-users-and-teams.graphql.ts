import { gql } from 'graphql-request';

// Query for fetching users with their team memberships
export const listUsersWithTeams = gql`
  query listUsersWithTeams($userIds: [ID!], $limit: Int) {
    users(ids: $userIds, limit: $limit) {
      # Basic User Information
      id
      name
      title
      email
      enabled

      # User Status & Permissions
      is_admin
      is_guest
      is_pending
      is_verified
      is_view_only

      # Timestamps
      join_date
      last_activity

      # Contact Information
      location
      mobile_phone
      phone
      photo_thumb
      time_zone_identifier
      utc_hours_diff

      # Team Memberships
      teams {
        id
        name
        is_guest
        picture_url
      }
    }
  }
`;

// Query for fetching teams with their members
export const listTeamsWithMembers = gql`
  query listTeamsWithMembers($teamIds: [ID!]) {
    teams(ids: $teamIds) {
      # Basic Team Information
      id
      name
      is_guest
      picture_url

      # Team Owners
      owners {
        id
        name
        email
      }

      # Team Members
      users {
        id
        name
        email
        title
        is_admin
        is_guest
        is_pending
        is_verified
        is_view_only
        join_date
        last_activity
        location
        mobile_phone
        phone
        photo_thumb
        time_zone_identifier
        utc_hours_diff
      }
    }
  }
`;

// Query for fetching both users and teams (when both IDs are provided or no IDs)
export const listUsersAndTeams = gql`
  query listUsersAndTeams($userIds: [ID!], $teamIds: [ID!], $userLimit: Int) {
    users(ids: $userIds, limit: $userLimit) {
      # Basic User Information
      id
      name
      title
      email
      enabled

      # User Status & Permissions
      is_admin
      is_guest
      is_pending
      is_verified
      is_view_only

      # Timestamps
      join_date
      last_activity

      # Contact Information
      location
      mobile_phone
      phone
      photo_thumb
      time_zone_identifier
      utc_hours_diff

      # Team Memberships
      teams {
        id
        name
        is_guest
      }
    }

    teams(ids: $teamIds) {
      # Basic Team Information
      id
      name
      is_guest
      picture_url

      # Team Owners
      owners {
        id
        name
        email
      }

      # Team Members
      users {
        id
        name
        email
        title
        is_admin
        is_guest
      }
    }
  }
`;