import { gql } from 'graphql-request';
import { DEFAULT_USER_LIMIT } from './constants';
// GraphQL Fragments for reusable field sets

// Fragment for basic user information (full user details)
const userDetailsFragment = gql`
  fragment UserDetails on User {
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
  }
`;

// Fragment for team membership info (teams within user context)
const userTeamMembershipFragment = gql`
  fragment UserTeamMembership on Team {
    id
    name
    is_guest
    picture_url
  }
`;

// Fragment for minimal team info (basic team data)
const teamBasicInfoFragment = gql`
  fragment TeamBasicInfo on Team {
    id
    name
  }
`;

// Fragment for extended team info (with guest and picture)
const teamExtendedInfoFragment = gql`
  fragment TeamExtendedInfo on Team {
    ...TeamBasicInfo
    is_guest
    picture_url
  }
`;

// Fragment for team owner info (simplified user data for owners)
const teamOwnerFragment = gql`
  fragment TeamOwner on User {
    id
    name
    email
  }
`;

// Fragment for team member info (user data for team members)
const teamMemberFragment = gql`
  fragment TeamMember on User {
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
`;

// Fragment for simplified team member info (for combined queries)
const teamMemberSimplifiedFragment = gql`
  fragment TeamMemberSimplified on User {
    id
    name
    email
    title
    is_admin
    is_guest
  }
`;

// Fragment for simplified team membership (for combined queries)
const userTeamMembershipSimplifiedFragment = gql`
  fragment UserTeamMembershipSimplified on Team {
    id
    name
    is_guest
  }
`;

// Query for fetching users with their team memberships
export const listUsersWithTeams = gql`
  ${userDetailsFragment}
  ${userTeamMembershipFragment}

  query listUsersWithTeams($userIds: [ID!]) {
    users(ids: $userIds, limit: ${DEFAULT_USER_LIMIT}) {
      ...UserDetails

      # Team Memberships
      teams {
        ...UserTeamMembership
      }
    }
  }
`;

// Query for fetching teams only (efficient - no detailed user data)
export const listTeamsOnly = gql`
  ${teamBasicInfoFragment}

  query listTeamsOnly($teamIds: [ID!]) {
    teams(ids: $teamIds) {
      ...TeamBasicInfo
    }
  }
`;

// Query for fetching teams with their members (includes detailed user data)
export const listTeamsWithMembers = gql`
  ${teamExtendedInfoFragment}
  ${teamBasicInfoFragment}
  ${teamOwnerFragment}
  ${teamMemberFragment}

  query listTeamsWithMembers($teamIds: [ID!]) {
    teams(ids: $teamIds) {
      ...TeamExtendedInfo

      # Team Owners
      owners {
        ...TeamOwner
      }

      # Team Members
      users {
        ...TeamMember
      }
    }
  }
`;

// Query for fetching users only (when we don't want teams in response)
export const listUsersOnly = gql`
  ${userDetailsFragment}
  ${userTeamMembershipFragment}

  query listUsersOnly($userIds: [ID!]) {
    users(ids: $userIds, limit: ${DEFAULT_USER_LIMIT}) {
      ...UserDetails

      # Team Memberships
      teams {
        ...UserTeamMembership
      }
    }
  }
`;

// Query for fetching both users and teams (when both are explicitly requested)
export const listUsersAndTeams = gql`
  ${userDetailsFragment}
  ${userTeamMembershipSimplifiedFragment}
  ${teamExtendedInfoFragment}
  ${teamBasicInfoFragment}
  ${teamOwnerFragment}
  ${teamMemberSimplifiedFragment}

  query listUsersAndTeams($userIds: [ID!], $teamIds: [ID!]) {
    users(ids: $userIds, limit: ${DEFAULT_USER_LIMIT}) {
      ...UserDetails

      # Team Memberships (simplified for this context)
      teams {
        ...UserTeamMembershipSimplified
      }
    }

    teams(ids: $teamIds) {
      ...TeamExtendedInfo

      # Team Owners
      owners {
        ...TeamOwner
      }

      # Team Members (simplified for this context)
      users {
        ...TeamMemberSimplified
      }
    }
  }
`;