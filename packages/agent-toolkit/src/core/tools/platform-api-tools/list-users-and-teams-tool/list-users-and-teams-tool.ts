import { z } from 'zod';
import {
  GetUserByNameQuery,
  GetUserByNameQueryVariables,
  ListUsersAndTeamsQuery,
  ListUsersAndTeamsQueryVariables,
  ListUsersWithTeamsQuery,
  ListUsersWithTeamsQueryVariables,
  ListTeamsWithMembersQuery,
  ListTeamsWithMembersQueryVariables,
  ListUsersOnlyQuery,
  ListUsersOnlyQueryVariables,
  ListTeamsOnlyQuery,
  ListTeamsOnlyQueryVariables,
} from '../../../../monday-graphql/generated/graphql';
import {
  listUsersAndTeams,
  listUsersWithTeams,
  listTeamsWithMembers,
  listTeamsOnly,
  listUsersOnly,
  getUserByName,
} from './list-users-and-teams.graphql';
import { gql } from 'graphql-request';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { formatUsersAndTeams } from './helpers';
import { FormattedResponse } from './types';
import { MAX_USER_IDS, MAX_TEAM_IDS, DEFAULT_USER_LIMIT } from './constants';

// Simple query for getting current user
const getCurrentUserQuery = gql`
  query getCurrentUser {
    me {
      id
      name
      title
      email
      enabled
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
      teams {
        id
        name
        is_guest
        picture_url
      }
    }
  }
`;

// Type for the getCurrentUser query response
type GetCurrentUserQuery = {
  me?: {
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
    join_date?: string | null;
    last_activity?: string | null;
    location?: string | null;
    mobile_phone?: string | null;
    phone?: string | null;
    photo_thumb?: string | null;
    time_zone_identifier?: string | null;
    utc_hours_diff?: number | null;
    teams?: Array<{
      id: string;
      name: string;
      is_guest?: boolean | null;
      picture_url?: string | null;
    }> | null;
  } | null;
};

export const listUsersAndTeamsToolSchema = {
  userIds: z
    .array(z.string())
    .max(MAX_USER_IDS)
    .optional()
    .describe(
      `Specific user IDs to fetch (max ${MAX_USER_IDS}). Returns comprehensive user profiles including: name, email, title, permissions (admin/guest/view-only), contact info (phone, location), timezone, join date, last activity, and team memberships. 
      
      WHEN TO USE: When you have specific user IDs from board items, mentions, assignments, or previous queries. More efficient than searching all users.
      
      EXAMPLES: ["12345678", "87654321"] for specific users, or omit to get all users in account.`,
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(
      `Specific team IDs to fetch (max ${MAX_TEAM_IDS}). Returns team details including: name, picture, owners, and members (when includeTeamMembers=true).
      
      WHEN TO USE: When you have team IDs from board permissions, assignments, or need to analyze team composition. Use with includeTeamMembers=true for member details.
      
      EXAMPLES: ["98765432", "11223344"] for specific teams, or omit to get all teams when teamsOnly=true.`,
    ),
  name: z
    .string()
    .optional()
    .describe(
      `Search for users by name or partial name. Returns users whose names contain this string (case-insensitive fuzzy search).
      
      WHEN TO USE: When you need to find specific users but only know their name/partial name. Great for discovering user IDs when you know names.
      
      EXAMPLES: "John Smith", "john", "smith" - all will find users with those name patterns.
      
      CONFLICTS: Cannot be used with userIds, teamIds, teamsOnly, or includeTeams - this parameter provides a focused name-based search.`,
    ),
  getMe: z
    .boolean()
    .optional()
    .describe(
      `Fetch the current authenticated user's profile information. Returns detailed profile of the user making the API request.
      
      WHEN TO USE: When you need current user's details for personalization, permissions checking, or user context operations.
      
      EXAMPLES: User profile display, checking current user's admin status, getting user's team memberships for context.
      
      CONFLICTS: Cannot be used with any other parameters - this is a standalone operation for the authenticated user only.`,
    ),
  includeTeams: z
    .boolean()
    .optional()
    .describe(
      `Include teams data alongside users in response. When true, returns both users AND teams sections.
      
      WHEN TO USE: When you need comprehensive workspace overview, analyzing user-team relationships, or setting up permissions. 
      
      PERFORMANCE: Adds teams query overhead. Use teamsOnly=true if you only need teams.`,
    ),
  teamsOnly: z
    .boolean()
    .optional()
    .describe(
      `Fetch only teams (no users returned). Optimized for team-focused operations.
      
      WHEN TO USE: Analyzing team structure, setting team permissions, or when users data is not needed. More efficient than includeTeams=true when users aren't required.
      
      COMBINE WITH: includeTeamMembers=true to get team member details, or false for just team names/IDs.`,
    ),
  includeTeamMembers: z
    .boolean()
    .optional()
    .describe(
      `Include detailed member information in team responses. When false, teams show only basic info (name, picture) for better performance.
      
      WHEN TO USE: When analyzing team composition, member roles, or need member contact details. 
      
      PERFORMANCE: Significantly increases response size. Use false for team lists/overviews, true for detailed team analysis.`,
    ),
};

export class ListUsersAndTeamsTool extends BaseMondayApiTool<typeof listUsersAndTeamsToolSchema> {
  name = 'list_users_and_teams';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'List Users and Teams',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Comprehensive user and team management tool for monday.com workspaces. Supports multiple query patterns including name search and current user lookup.

      CORE FUNCTIONALITY:
      • User profiles: name, email, title, permissions, contact info, timezone, activity, team memberships
      • Team details: name, picture, owners, member composition and roles
      • Name-based user search: fuzzy search by full/partial names
      • Current user authentication: get authenticated user's profile
      • Automatic query optimization based on parameters
      • Enterprise-safe limits: max ${MAX_USER_IDS} user IDs, ${MAX_TEAM_IDS} team IDs

      COMMON USE CASES:
      1. GET SPECIFIC USERS: Use userIds=["123", "456"] when you have IDs from board items, assignments, or mentions
      2. EXPLORE ALL USERS: Omit all parameters for complete account overview (up to 1000 users)
      3. SEARCH BY NAME: Use name="John Smith" to find users by name/partial name (fuzzy search)
      4. GET CURRENT USER: Use getMe=true to fetch authenticated user's profile and teams
      5. ANALYZE TEAMS: Use teamsOnly=true + includeTeamMembers=true for team composition analysis
      6. WORKSPACE OVERVIEW: Use includeTeams=true for comprehensive user-team relationships

      STANDALONE OPERATIONS (cannot be combined):
      • NAME SEARCH: name parameter - finds users by name pattern, returns with team memberships
      • CURRENT USER: getMe=true - returns authenticated user's complete profile
      • These parameters conflict with all others for focused, optimized queries

      OPTIMIZATION TIPS:
       • Default behavior (no params): Returns up to 1000 users with team memberships
       • Name search: Fast fuzzy search, ideal when you know names but not IDs
       • Current user: Instant authenticated user lookup for personalization
       • Specific IDs: Always faster and more detailed than searching all users
       • Team members: Set includeTeamMembers=false for team lists, true for detailed analysis
       • Large enterprise accounts: Use name search or specific IDs for targeted queries

      QUERY PATTERNS:
      • Users only (default): Fast user directory with team memberships
      • Name search: name="partial" for fuzzy user discovery
      • Current user: getMe=true for authenticated user context
      • Teams only: teamsOnly=true for team-focused operations  
      • Combined: includeTeams=true for full workspace analysis
      • Targeted: Specific IDs for detailed individual/team profiles`;
  }

  getInputSchema(): typeof listUsersAndTeamsToolSchema {
    return listUsersAndTeamsToolSchema;
  }

  protected async executeInternal(
    input: ToolInputType<typeof listUsersAndTeamsToolSchema>,
  ): Promise<ToolOutputType<never>> {
    const hasUserIds = input.userIds && input.userIds.length > 0;
    const hasTeamIds = input.teamIds && input.teamIds.length > 0;
    const includeTeams = input.includeTeams || false;
    const teamsOnly = input.teamsOnly || false;
    const includeTeamMembers = input.includeTeamMembers || false;
    const hasName = !!input.name;
    const getMe = input.getMe || false;

    // Handle getMe parameter (standalone operation)
    if (getMe) {
      if (hasUserIds || hasTeamIds || includeTeams || teamsOnly || includeTeamMembers || hasName) {
        return {
          content:
            'Error: getMe parameter cannot be used with any other parameters. Use getMe alone to fetch current user.',
        };
      }

      const res = await this.mondayApi.request<GetCurrentUserQuery>(getCurrentUserQuery);

      if (!res.me) {
        return {
          content: 'Error: Unable to fetch current user information. Please check your authentication.',
        };
      }

      // Convert single user response to our FormattedResponse format
      const formattedRes: FormattedResponse = {
        users: [res.me as any], // Cast needed because the fragments match but types might differ slightly
      };

      const content = formatUsersAndTeams(formattedRes);
      return { content };
    }

    // Handle name parameter (standalone search operation)
    if (hasName) {
      if (hasUserIds || hasTeamIds || includeTeams || teamsOnly || includeTeamMembers) {
        return {
          content:
            'Error: name parameter cannot be used with userIds, teamIds, includeTeams, teamsOnly, or includeTeamMembers. Use name alone for user search.',
        };
      }

      const variables: GetUserByNameQueryVariables = {
        name: input.name,
      };

      const res = await this.mondayApi.request<GetUserByNameQuery>(getUserByName, variables);

      if (!res.users || res.users.length === 0) {
        return {
          content: `No users found with name containing "${input.name}".`,
        };
      }

      // Convert basic user search response to simplified format
      const userList = res.users
        .filter((user) => user !== null)
        .map((user) => `• **${user!.name}** (ID: ${user!.id})${user!.title ? ` - ${user!.title}` : ''}`)
        .join('\n');

      const content = `Found ${res.users.length} user(s) matching "${input.name}":\n\n${userList}`;
      return { content };
    }

    // Validate conflicting flags for regular operations
    if (teamsOnly && includeTeams) {
      return {
        content: 'Error: Cannot specify both teamsOnly and includeTeams flags. Choose one.',
      };
    }

    // Early validation for enterprise safety
    if (hasUserIds && input.userIds && input.userIds.length > MAX_USER_IDS) {
      return {
        content: `Error: Too many user IDs provided. Maximum allowed: ${MAX_USER_IDS}, provided: ${input.userIds.length}. Please reduce the number of user IDs, break up the ids and batch them in multiple calls`,
      };
    }

    if (hasTeamIds && input.teamIds && input.teamIds.length > MAX_TEAM_IDS) {
      return {
        content: `Error: Too many team IDs provided. Maximum allowed: ${MAX_TEAM_IDS}, provided: ${input.teamIds.length}. Please reduce the number of team IDs, break up the ids and batch them in multiple calls`,
      };
    }

    let res: FormattedResponse;

    // Determine what to fetch based on flags and IDs
    if (teamsOnly || (!hasUserIds && hasTeamIds && !includeTeams)) {
      // Fetch only teams - use efficient query unless detailed member info is requested
      if (includeTeamMembers) {
        // Fetch teams with detailed member information
        const variables: ListTeamsWithMembersQueryVariables = {
          teamIds: input.teamIds,
        };
        res = await this.mondayApi.request<ListTeamsWithMembersQuery>(listTeamsWithMembers, variables);
      } else {
        // Fetch teams only (efficient - no detailed member data)
        const variables: ListTeamsOnlyQueryVariables = {
          teamIds: input.teamIds,
        };
        res = await this.mondayApi.request<ListTeamsOnlyQuery>(listTeamsOnly, variables);
      }
    } else if (!includeTeams) {
      // Fetch users only (default behavior) - no separate teams section in response
      if (hasUserIds) {
        // Specific users with their team memberships (but no separate teams section)
        const variables: ListUsersWithTeamsQueryVariables = {
          userIds: input.userIds,
          limit: DEFAULT_USER_LIMIT,
        };
        res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
      } else {
        // All users (but no separate teams section)
        const variables: ListUsersOnlyQueryVariables = {
          userIds: undefined,
          limit: DEFAULT_USER_LIMIT,
        };
        res = await this.mondayApi.request<ListUsersOnlyQuery>(listUsersOnly, variables);
      }
    } else {
      // includeTeams=true: Fetch both users and teams sections
      const variables: ListUsersAndTeamsQueryVariables = {
        userIds: input.userIds,
        teamIds: input.teamIds,
        limit: DEFAULT_USER_LIMIT,
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}
