import { FormattedResponse, isExtendedTeam, UserTeam } from './types';

// Configuration for optional team member fields: [fieldName, displayLabel]
const optionalTeamMemberFields: Array<[string, string]> = [
  ['is_pending', 'Pending'],
  ['is_verified', 'Verified'],
  ['is_view_only', 'View Only'],
  ['join_date', 'Join Date'],
  ['last_activity', 'Last Activity'],
  ['location', 'Location'],
  ['mobile_phone', 'Mobile Phone'],
  ['phone', 'Phone'],
  ['photo_thumb', 'Photo Thumb'],
  ['time_zone_identifier', 'Timezone'],
  ['utc_hours_diff', 'UTC Hours Diff'],
];

// For optional fields - returns array of formatted strings
function formatOptionalUserFields(user: Record<string, any>, prefix = ''): string[] {
  return optionalTeamMemberFields
    .filter(([fieldName]) => {
      const value = user[fieldName];
      return value !== undefined && value !== null;
    })
    .map(([fieldName, displayLabel]) => `${prefix}${displayLabel}: ${user[fieldName]}`);
}

export const formatUsersAndTeams = (data: FormattedResponse): string => {
  const sections: string[] = [];

  // Format Users
  if ('users' in data && data.users && data.users.length > 0) {
    sections.push('Users:');
    data.users.forEach((user) => {
      if (user) {
        sections.push(`  ID: ${user.id}`);
        sections.push(`  Name: ${user.name}`);
        sections.push(`  Email: ${user.email}`);
        sections.push(`  Title: ${user.title || 'N/A'}`);
        sections.push(`  Enabled: ${user.enabled}`);
        sections.push(`  Admin: ${user.is_admin || false}`);
        sections.push(`  Guest: ${user.is_guest || false}`);
        // Add optional fields that exist and have values
        sections.push(...formatOptionalUserFields(user, '  '));

        if (user.teams && user.teams.length > 0) {
          sections.push(`  Teams:`);
          user.teams.forEach((team) => {
            if (team) {
              sections.push(
                `    - ID: ${team.id}, Name: ${team.name}, Guest Team: ${team.is_guest || false}, Picture URL: ${team.picture_url || 'N/A'}`,
              );
            }
          });
        }
        sections.push('');
      }
    });
  }

  // Format Teams
  if ('teams' in data && data.teams && data.teams.length > 0) {
    sections.push('Teams:');
    data.teams.forEach((team) => {
      if (team) {
        sections.push(`  ID: ${team.id}`);
        sections.push(`  Name: ${team.name}`);

        // Check if this is an extended team with additional properties and member details
        if (isExtendedTeam(team)) {
          sections.push(`  Guest Team: ${team.is_guest || false}`);
          sections.push(`  Picture URL: ${team.picture_url || 'N/A'}`);

          if (team.owners && team.owners.length > 0) {
            sections.push(`  Owners:`);
            team.owners.forEach((owner) => {
              sections.push(`    - ID: ${owner.id}, Name: ${owner.name}, Email: ${owner.email}`);
            });
          }

          if (team.users && team.users.length > 0) {
            sections.push(`  Members:`);
            team.users.forEach((user) => {
              if (user) {
                // Build member details line with required fields
                const memberDetails = [
                  `ID: ${user.id}`,
                  `Name: ${user.name}`,
                  `Email: ${user.email}`,
                  `Title: ${user.title || 'N/A'}`,
                  `Admin: ${user.is_admin || false}`,
                  `Guest: ${user.is_guest || false}`,
                  // Add all optional fields that exist and have values
                  ...formatOptionalUserFields(user),
                ];

                sections.push(`    - ${memberDetails.join(', ')}`);
              }
            });
          }
        }
        sections.push('');
      }
    });
  }

  if (sections.length === 0) {
    return 'No users or teams found with the specified filters.';
  }

  return sections.join('\n').trim();
};
