import { z } from 'zod';
import {
  ListUsersAndTeamsQuery,
  ListUsersAndTeamsQueryVariables,
  ListUsersWithTeamsQuery,
  ListUsersWithTeamsQueryVariables,
  ListTeamsWithMembersQuery,
  ListTeamsWithMembersQueryVariables,
  ListUsersOnlyQuery,
  ListUsersOnlyQueryVariables,
} from '../../../../monday-graphql/generated/graphql';
import {
  listUsersAndTeams,
  listUsersWithTeams,
  listTeamsWithMembers,
  listTeamsOnly,
  listUsersOnly,
} from './list-users-and-teams.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { formatUsersAndTeams } from './helpers';
import { FormattedResponse } from './types';
import { MAX_USER_LIMIT, MAX_USER_IDS, MAX_TEAM_IDS, DEFAULT_USER_LIMIT } from './constants';

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
  userLimit: z
    .number()
    .min(1)
    .max(MAX_USER_LIMIT)
    .optional()
    .describe(
      `Maximum users to return when fetching all users (max ${MAX_USER_LIMIT}). Only applies when userIds is not specified.
      
      WHEN TO USE: Essential for large enterprise accounts (1000+ users) to prevent timeouts and optimize response times. Start with 50-100 for exploration, increase as needed.
      
      PERFORMANCE: Smaller limits = faster responses, better for initial discovery. Large accounts should start small then increase.
      
      DEFAULT: ${DEFAULT_USER_LIMIT} users (covers 95% of monday.com accounts).`,
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
    return `Retrieve comprehensive user and team information from monday.com workspace. Supports multiple query patterns for optimal performance.

      CORE FUNCTIONALITY:
      • User profiles: name, email, title, permissions, contact info, timezone, activity, team memberships
      • Team details: name, picture, owners, member composition and roles
      • Automatic query optimization based on parameters
      • Enterprise-safe limits: max ${MAX_USER_IDS} user IDs, ${MAX_TEAM_IDS} team IDs, ${MAX_USER_LIMIT} users

      COMMON USE CASES:
      1. GET SPECIFIC USERS: Use userIds=["123", "456"] when you have IDs from board items, assignments, or mentions
      2. EXPLORE ALL USERS: Omit userIds, set userLimit=50-100 for account overview or user discovery
      3. ANALYZE TEAMS: Use teamsOnly=true + includeTeamMembers=true for team composition analysis
      4. WORKSPACE OVERVIEW: Use includeTeams=true for comprehensive user-team relationships
      5. PERFORMANCE QUERIES: Use targeted parameters - specific IDs are faster than full scans

      OPTIMIZATION TIPS:
       • Default behavior (no params): Returns up to 1000 users with team memberships
       • Specific IDs: Always faster and more detailed than searching all users
       • Team members: Set includeTeamMembers=false for team lists, true for detailed analysis
       • Large enterprise accounts: Use userLimit=50-100 for initial exploration, then increase
       • Response size: Lower limits = faster responses and reduced token usage

      QUERY PATTERNS:
      • Users only (default): Fast user directory with team memberships
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
    const hasUserIds = input.userIds?.length > 0;
    const hasTeamIds = input.teamIds?.length > 0;
    const includeTeams = input.includeTeams || false;
    const teamsOnly = input.teamsOnly || false;
    const includeTeamMembers = input.includeTeamMembers || false;

    // Validate conflicting flags
    if (teamsOnly && includeTeams) {
      return {
        content: 'Error: Cannot specify both teamsOnly and includeTeams flags. Choose one.',
      };
    }

    // Calculate safe user limit
    const userLimit = input.userLimit || DEFAULT_USER_LIMIT;
    const safeUserLimit = Math.min(userLimit, MAX_USER_LIMIT);

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
        const variables: ListTeamsWithMembersQueryVariables = {
          teamIds: input.teamIds,
        };
        res = await this.mondayApi.request<FormattedResponse>(listTeamsOnly, variables);
      }
    } else if (!includeTeams) {
      // Fetch users only (default behavior) - no separate teams section in response
      if (hasUserIds) {
        // Specific users with their team memberships (but no separate teams section)
        const variables: ListUsersWithTeamsQueryVariables = {
          userIds: input.userIds,
          limit: safeUserLimit,
        };
        res = await this.mondayApi.request<ListUsersWithTeamsQuery>(listUsersWithTeams, variables);
      } else {
        // All users (but no separate teams section)
        const variables: ListUsersOnlyQueryVariables = {
          userIds: undefined,
          userLimit: safeUserLimit,
        };
        res = await this.mondayApi.request<ListUsersOnlyQuery>(listUsersOnly, variables);
      }
    } else {
      // includeTeams=true: Fetch both users and teams sections
      const variables: ListUsersAndTeamsQueryVariables = {
        userIds: input.userIds,
        teamIds: input.teamIds,
        userLimit: safeUserLimit,
      };
      res = await this.mondayApi.request<ListUsersAndTeamsQuery>(listUsersAndTeams, variables);
    }

    const content = formatUsersAndTeams(res);

    return {
      content,
    };
  }
}