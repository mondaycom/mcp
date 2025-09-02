import { z } from 'zod';
import {
  GetUserByNameQuery,
  GetUserByNameQueryVariables,
  GetCurrentUserQuery,
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
  getCurrentUser,
} from './list-users-and-teams.graphql';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { formatUsersAndTeams } from './helpers';
import { FormattedResponse } from './types';
import { MAX_USER_IDS, MAX_TEAM_IDS, DEFAULT_USER_LIMIT } from './constants';

export const listUsersAndTeamsToolSchema = {
  userIds: z
    .array(z.string())
    .max(MAX_USER_IDS)
    .optional()
    .describe(
      `[HIGH PRIORITY] Specific user IDs to fetch (max ${MAX_USER_IDS}). ALWAYS use this when you have user IDs from board assignments, mentions, previous queries, or any context where user IDs are available.
      
      AI AGENT DIRECTIVE: This is the MOST EFFICIENT parameter. Use whenever you have specific user IDs - never use broad searches when IDs are available.
      
      RETURNS: Complete user profiles with team memberships. EXAMPLES: ["12345678", "87654321"]`,
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(
      `[HIGH PRIORITY] Specific team IDs to fetch (max ${MAX_TEAM_IDS}). ALWAYS use this when you have team IDs from board permissions, assignments, team context or elsewhere.
      
      AI AGENT DIRECTIVE: Use with teamsOnly: true for teams without user data, or includeTeamMembers: true for detailed member analysis. NEVER fetch all teams when specific IDs are available.
      
      RETURNS: Team details with owners and optional member data. EXAMPLES: ["98765432", "11223344"]`,
    ),
  name: z
    .string()
    .optional()
    .describe(
      `[SECOND PRIORITY] Name-based user search. STANDALONE parameter - cannot be combined with others.
      
      AI AGENT DIRECTIVE: Use ONLY when you have user names but no IDs. This is your PREFERRED method for finding users when you know names. Performs fuzzy matching.
      
      CRITICAL: This parameter CONFLICTS with all others. EXAMPLES: "John Smith", "john", "smith"`,
    ),
  getMe: z
    .boolean()
    .optional()
    .describe(
      `[TOP PRIORITY] Current authenticated user lookup. STANDALONE parameter - cannot be combined with others.
      
      AI AGENT DIRECTIVE: Use ALWAYS when requesting current user information. Returns basic profile: id, name, title, enabled, is_admin, is_guest. Should be used when a user asks to get "my user" or "me".
      
      CRITICAL: This parameter CONFLICTS with all others. Pass boolean value true (not string "true") for authenticated user's basic details.`,
    ),
  includeTeams: z
    .boolean()
    .optional()
    .describe(
      `[AVOID UNLESS NECESSARY] Include general teams data alongside users. Creates dual query overhead. This does not fetch a specific user's teams rather all teams in the account. To fetch a specific user's teams just fetch that user by id and you will get the team memberships.
      
      AI AGENT DIRECTIVE: AVOID this parameter unless you specifically need both users AND teams in one response. Use teamsOnly: true for teams-only queries instead.
      
      PERFORMANCE WARNING: Adds significant query overhead. Use sparingly.`,
    ),
  teamsOnly: z
    .boolean()
    .optional()
    .describe(
      `[RECOMMENDED FOR TEAMS] Fetch only teams, no users returned. Optimized single-purpose query.
      
      AI AGENT DIRECTIVE: Use teamsOnly: true when you only need team information. More efficient than includeTeams: true. Combine with includeTeamMembers for member details.
      
      USAGE: teamsOnly: true for team lists, add includeTeamMembers: true for member analysis.`,
    ),
  includeTeamMembers: z
    .boolean()
    .optional()
    .describe(
      `[CONDITIONAL] Control team member data inclusion. Use strategically for performance.
      
      AI AGENT DIRECTIVE: Set to false for simple team lists (faster), true only when you need member composition analysis. Default is false for better performance.
      
      DECISION LOGIC: false=team names/IDs only, true=full member details with roles and permissions.`,
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
    return `PRECISION-FIRST user and team retrieval tool. AI agents MUST prioritize specific queries over broad searches.

      MANDATORY BEST PRACTICES:
      1. ALWAYS use specific IDs when available (userIds, teamIds) - highest precision and performance
      2. ALWAYS use name search when you have user names but no IDs  
      3. ALWAYS use boolean getMe: true when requesting current user information
      4. AVOID broad queries (no parameters) - use only as absolute last resort
      5. COMBINE parameters strategically to minimize API calls

      REQUIRED PARAMETER PRIORITY (use in this order):
      1. getMe: true (when requesting current user) - STANDALONE ONLY
      2. name="exact_name" (when searching by name) - STANDALONE ONLY  
      3. userIds=["id1","id2"] (when you have specific user IDs)
      4. teamIds=["id1","id2"] + teamsOnly: true (when you have specific team IDs)
      5. No parameters (LAST RESORT - fetches up to 1000 users, avoid unless absolutely necessary)

      CRITICAL USAGE RULES:
      • getMe and name parameters CANNOT be combined with any other parameters
      • userIds + teamIds requires explicit includeTeams: true flag
      • teamsOnly: true prevents user data fetching (teams-only queries)
      • includeTeamMembers: true adds detailed member data to teams
      • includeTeams: true fetches both users and teams, do not use this to fetch a specific user's teams rather fetch that user by id and you will get their team memberships.

      OPTIMIZATION DIRECTIVES:
      • NEVER fetch all users when specific IDs are available
      • NEVER use broad queries for single user/team lookups  
      • ALWAYS prefer name search over ID-less queries for individual users
      • SET includeTeamMembers: false for team lists, true only for member analysis  
      • AVOID includeTeams: true unless you specifically need both users AND teams
      • AVOID broad queries for single user/team, if you have specific IDs, use them. For example getting a user's teams, use that user's ID and fetch their team using the includeTeams flag.

      RESPONSE CONTENT:
      • Users: id, name, email, title, permissions, contact details, team memberships
      • Teams: id, name, owners, members (when includeTeamMembers: true)
      • Current user: id, name, title, enabled, is_admin, is_guest (basic profile only)`;
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
            'PARAMETER_CONFLICT: getMe is STANDALONE only. Remove all other parameters when using getMe: true for current user lookup.',
        };
      }

      const res = await this.mondayApi.request<GetCurrentUserQuery>(getCurrentUser);

      if (!res.me) {
        return {
          content: 'AUTHENTICATION_ERROR: Current user fetch failed. Verify API token and user permissions.',
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
            'PARAMETER_CONFLICT: name is STANDALONE only. Remove userIds, teamIds, includeTeams, teamsOnly, and includeTeamMembers when using name search.',
        };
      }

      const variables: GetUserByNameQueryVariables = {
        name: input.name,
      };

      const res = await this.mondayApi.request<GetUserByNameQuery>(getUserByName, variables);

      if (!res.users || res.users.length === 0) {
        return {
          content: `NAME_SEARCH_EMPTY: No users found matching "${input.name}". Try broader search terms or verify user exists in account.`,
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
        content:
          'PARAMETER_CONFLICT: Cannot use teamsOnly: true with includeTeams: true. Use teamsOnly for teams-only queries or includeTeams for combined data.',
      };
    }

    // Early validation
    if (hasUserIds && input.userIds && input.userIds.length > MAX_USER_IDS) {
      return {
        content: `LIMIT_EXCEEDED: userIds array too large (${input.userIds.length}/${MAX_USER_IDS}). Split into batches of max ${MAX_USER_IDS} IDs and make multiple calls.`,
      };
    }

    if (hasTeamIds && input.teamIds && input.teamIds.length > MAX_TEAM_IDS) {
      return {
        content: `LIMIT_EXCEEDED: teamIds array too large (${input.teamIds.length}/${MAX_TEAM_IDS}). Split into batches of max ${MAX_TEAM_IDS} IDs and make multiple calls.`,
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
