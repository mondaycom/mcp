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
      `A list of user IDs to filter on (max ${MAX_USER_IDS}). 
      When specified, returns detailed user information for those user ids including team memberships and various other details defined for the user. 
      Use this to get more information such as name, contact informtion, etc. for any user by id.
      Always prefer to fetch users by id if you know the specific ids. 
      Data on the current user will be returned as part of any call`,
    ),
  teamIds: z
    .array(z.string())
    .max(MAX_TEAM_IDS)
    .optional()
    .describe(
      `A list of team IDs to filter on (max ${MAX_TEAM_IDS}). 
      When specified, returns detailed team information including team members`,
    ),
  userLimit: z
    .number()
    .min(1)
    .max(MAX_USER_LIMIT)
    .optional()
    .describe(`Maximum number of users to return (max ${MAX_USER_LIMIT}). Only applies when no userIds are specified`),
  includeTeams: z
    .boolean()
    .optional()
    .describe('Include teams in the response along with users. Default is false (users only)'),
  teamsOnly: z.boolean().optional().describe('Fetch only teams (no users). When true, only teams will be returned'),
  includeTeamMembers: z
    .boolean()
    .optional()
    .describe('Include detailed team member information when fetching teams. Default is false for better performance'),
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
    return `Get users or teams data, either by id or by fetching all users from the account. 
    By default returns only users. Use includeTeams=true to also fetch teams, or teamsOnly=true to fetch only teams. 
    Supports filtering by user/team IDs with automatic query optimization. 
    Max limits: ${MAX_USER_IDS} user IDs, ${MAX_TEAM_IDS} team IDs, ${MAX_USER_LIMIT} users. 
    When filtering by specific IDs, returns detailed information including memberships.`;
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
    if (hasUserIds && input.userIds!.length > MAX_USER_IDS) {
      return {
        content: `Error: Too many user IDs provided. Maximum allowed: ${MAX_USER_IDS}, provided: ${input.userIds!.length}. Please reduce the number of user IDs, break up the ids and batch them in multiple calls`,
      };
    }

    if (hasTeamIds && input.teamIds!.length > MAX_TEAM_IDS) {
      return {
        content: `Error: Too many team IDs provided. Maximum allowed: ${MAX_TEAM_IDS}, provided: ${input.teamIds!.length}. Please reduce the number of team IDs, break up the ids and batch them in multiple calls`,
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