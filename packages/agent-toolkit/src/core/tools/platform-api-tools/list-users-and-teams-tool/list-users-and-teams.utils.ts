import { FormattedResponse, isExtendedTeam, UserTeam } from './types';

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
        sections.push(`  Pending: ${user.is_pending || false}`);
        sections.push(`  Verified: ${user.is_verified || false}`);
        sections.push(`  View Only: ${user.is_view_only || false}`);
        sections.push(`  Join Date: ${user.join_date || 'N/A'}`);
        sections.push(`  Last Activity: ${user.last_activity || 'N/A'}`);
        sections.push(`  Location: ${user.location || 'N/A'}`);
        sections.push(`  Mobile Phone: ${user.mobile_phone || 'N/A'}`);
        sections.push(`  Phone: ${user.phone || 'N/A'}`);
        sections.push(`  Timezone: ${user.time_zone_identifier || 'N/A'}`);
        sections.push(`  UTC Hours Diff: ${user.utc_hours_diff || 'N/A'}`);

        if (user.teams && user.teams.length > 0) {
          sections.push(`  Teams:`);
          user.teams.forEach((team) => {
            if (team) {
              sections.push(`    - ID: ${team.id}, Name: ${team.name}, Guest Team: ${team.is_guest || false}`);
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
                sections.push(
                  `    - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Title: ${user.title || 'N/A'}, Admin: ${user.is_admin || false}, Guest: ${user.is_guest || false}`,
                );
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
