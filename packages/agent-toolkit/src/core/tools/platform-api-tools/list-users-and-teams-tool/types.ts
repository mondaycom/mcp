/**
 * Type definitions for list_users_and_teams tool responses
 */

// Base team structure (minimal - for efficient queries)
export interface BaseTeam {
  __typename?: 'Team';
  id: string;
  name: string;
}

// Extended team structure (includes owners and members)
export interface ExtendedTeam extends BaseTeam {
  is_guest?: boolean | null;
  picture_url?: string | null;
  owners: Array<{
    __typename?: 'User';
    id: string;
    name: string;
    email: string;
  }>;
  users?: Array<{
    __typename?: 'User';
    id: string;
    name: string;
    email: string;
    title?: string | null;
    is_admin?: boolean | null;
    is_guest?: boolean | null;
    is_pending?: boolean | null;
    is_verified?: boolean | null;
    is_view_only?: boolean | null;
    join_date?: any | null;
    last_activity?: any | null;
    location?: string | null;
    mobile_phone?: string | null;
    phone?: string | null;
    photo_thumb?: string | null;
    time_zone_identifier?: string | null;
    utc_hours_diff?: number | null;
  } | null> | null;
}

// User structure (for team memberships)
export interface UserTeam {
  __typename?: 'Team';
  id: string;
  name: string;
  is_guest?: boolean | null;
  picture_url?: string | null;
}

// User structure 
export interface User {
  __typename?: 'User';
  id: string;
  name: string;
  title?: string | null;
  email: string;
  enabled: boolean;
  is_admin?: boolean | null;
  is_guest?: boolean | null;
  is_pending?: boolean | null;
  is_verified?: boolean | null;
  is_view_only?: boolean | null;
  join_date?: any | null;
  last_activity?: any | null;
  location?: string | null;
  mobile_phone?: string | null;
  phone?: string | null;
  photo_thumb?: string | null;
  time_zone_identifier?: string | null;
  utc_hours_diff?: number | null;
  teams?: Array<UserTeam | null> | null;
}

// Response types for different query scenarios
export interface UsersOnlyResponse {
  __typename?: 'Query';
  users?: Array<User | null> | null;
}

export interface TeamsResponse {
  __typename?: 'Query';
  teams?: Array<(BaseTeam | ExtendedTeam) | null> | null;
}

export interface UsersAndTeamsResponse {
  __typename?: 'Query';
  users?: Array<User | null> | null;
  teams?: Array<(BaseTeam | ExtendedTeam) | null> | null;
}

// Union type for all possible responses
export type FormattedResponse = 
  | UsersOnlyResponse 
  | TeamsResponse 
  | UsersAndTeamsResponse;

// Type guards
export function isUsersOnlyResponse(data: FormattedResponse): data is UsersOnlyResponse {
  return 'users' in data && !('teams' in data);
}

export function isTeamsResponse(data: FormattedResponse): data is TeamsResponse {
  return 'teams' in data && !('users' in data);
}

export function isUsersAndTeamsResponse(data: FormattedResponse): data is UsersAndTeamsResponse {
  return 'users' in data && 'teams' in data;
}

export function isExtendedTeam(team: BaseTeam | ExtendedTeam): team is ExtendedTeam {
  return 'owners' in team;
}
