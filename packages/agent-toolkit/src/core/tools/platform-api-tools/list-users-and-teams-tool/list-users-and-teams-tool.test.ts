import { formatUsersAndTeams, UsersAndTeamsData } from './helpers';

describe('ListUsersAndTeamsTool - Helper Functions', () => {
  describe('formatUsersAndTeams', () => {
    it('should format users and teams data correctly', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'John Doe',
            title: 'Developer',
            email: 'john@example.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '2023-01-01',
            last_activity: '2023-12-01',
            location: 'New York',
            mobile_phone: '+1234567890',
            phone: '+1234567890',
            photo_thumb: 'https://example.com/photo.jpg',
            time_zone_identifier: 'America/New_York',
            utc_hours_diff: -5,
            teams: [
              {
                id: '1',
                name: 'Development Team',
                is_guest: false,
              },
            ],
          },
        ],
        teams: [
          {
            id: '1',
            name: 'Development Team',
            is_guest: false,
            picture_url: 'https://example.com/team.jpg',
            owners: [
              {
                id: '2',
                name: 'Jane Smith',
                email: 'jane@example.com',
              },
            ],
            users: [
              {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                title: 'Developer',
                is_admin: false,
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      // Test users section
      expect(result).toContain('Users:');
      expect(result).toContain('ID: 1');
      expect(result).toContain('Name: John Doe');
      expect(result).toContain('Email: john@example.com');
      expect(result).toContain('Title: Developer');
      expect(result).toContain('Enabled: true');
      expect(result).toContain('Admin: false');
      expect(result).toContain('Guest: false');
      expect(result).toContain('Pending: false');
      expect(result).toContain('Verified: true');
      expect(result).toContain('View Only: false');
      expect(result).toContain('Join Date: 2023-01-01');
      expect(result).toContain('Last Activity: 2023-12-01');
      expect(result).toContain('Location: New York');
      expect(result).toContain('Mobile Phone: +1234567890');
      expect(result).toContain('Phone: +1234567890');
      expect(result).toContain('Timezone: America/New_York');
      expect(result).toContain('UTC Hours Diff: -5');
      expect(result).toContain('Teams:');
      expect(result).toContain('- ID: 1, Name: Development Team, Guest Team: false');

      // Test teams section
      expect(result).toContain('Teams:');
      expect(result).toContain('Picture URL: https://example.com/team.jpg');
      expect(result).toContain('Owners:');
      expect(result).toContain('- ID: 2, Name: Jane Smith, Email: jane@example.com');
      expect(result).toContain('Members:');
      expect(result).toContain('- ID: 1, Name: John Doe, Email: john@example.com, Title: Developer, Admin: false, Guest: false');
    });

    it('should handle users without teams', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'John Doe',
            title: 'Developer',
            email: 'john@example.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '2023-01-01',
            last_activity: '2023-12-01',
            location: 'New York',
            mobile_phone: '+1234567890',
            phone: '+1234567890',
            photo_thumb: 'https://example.com/photo.jpg',
            time_zone_identifier: 'America/New_York',
            utc_hours_diff: -5,
            teams: null,
          },
        ],
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('John Doe');
      expect(result).not.toContain('Teams:');
    });

    it('should handle teams without members or owners', () => {
      const mockData: UsersAndTeamsData = {
        users: null,
        teams: [
          {
            id: '1',
            name: 'Empty Team',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Teams:');
      expect(result).toContain('Empty Team');
      expect(result).toContain('Picture URL: N/A');
      expect(result).not.toContain('Owners:');
      expect(result).not.toContain('Members:');
    });

    it('should handle null values gracefully', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'John Doe',
            title: null,
            email: 'john@example.com',
            enabled: true,
            is_admin: null,
            is_guest: null,
            is_pending: null,
            is_verified: null,
            is_view_only: null,
            join_date: null,
            last_activity: null,
            location: null,
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: null,
            utc_hours_diff: null,
            teams: null,
          },
        ],
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('John Doe');
      expect(result).toContain('Title: N/A');
      expect(result).toContain('Admin: false');
      expect(result).toContain('Join Date: N/A');
      expect(result).toContain('Location: N/A');
      expect(result).toContain('Mobile Phone: N/A');
      expect(result).toContain('Timezone: N/A');
      expect(result).toContain('UTC Hours Diff: N/A');
    });

    it('should return appropriate message for empty data', () => {
      const mockData: UsersAndTeamsData = {
        users: null,
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toBe('No users or teams found with the specified filters.');
    });

    it('should handle empty arrays', () => {
      const mockData: UsersAndTeamsData = {
        users: [],
        teams: [],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toBe('No users or teams found with the specified filters.');
    });

    it('should handle multiple users and teams', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'John Doe',
            title: 'Developer',
            email: 'john@example.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: null,
            last_activity: null,
            location: null,
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: null,
            utc_hours_diff: null,
            teams: null,
          },
          {
            id: '2',
            name: 'Jane Smith',
            title: 'Manager',
            email: 'jane@example.com',
            enabled: true,
            is_admin: true,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: null,
            last_activity: null,
            location: null,
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: null,
            utc_hours_diff: null,
            teams: null,
          },
        ],
        teams: [
          {
            id: '1',
            name: 'Development Team',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
          {
            id: '2',
            name: 'Management Team',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Smith');
      expect(result).toContain('Development Team');
      expect(result).toContain('Management Team');
    });

    it('should handle enterprise-safe scenarios with limits', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'Enterprise User',
            title: 'Manager',
            email: 'enterprise@example.com',
            enabled: true,
            is_admin: true,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '2023-01-01',
            last_activity: '2023-12-01',
            location: 'HQ',
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: 'UTC',
            utc_hours_diff: 0,
            teams: [
              {
                id: '1',
                name: 'Enterprise Team',
                is_guest: false,
              },
            ],
          },
        ],
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Enterprise User');
      expect(result).toContain('Admin: true');
      expect(result).toContain('Enterprise Team');
    });

    it('should handle users-only response (default behavior)', () => {
      const mockData: UsersAndTeamsData = {
        users: [
          {
            id: '1',
            name: 'Default User',
            title: 'Developer',
            email: 'user@example.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '2023-01-01',
            last_activity: '2023-12-01',
            location: 'Office',
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: 'America/New_York',
            utc_hours_diff: -5,
            teams: [
              {
                id: '1',
                name: 'Dev Team',
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Users:');
      expect(result).toContain('Default User');
      expect(result).toContain('Developer');
      expect(result).toContain('user@example.com');
      expect(result).toContain('Teams:');
      expect(result).toContain('Dev Team');
      // Should not contain a separate Teams section
      expect(result.split('Teams:').length).toBe(2); // Only one "Teams:" for user's teams
    });

    it('should handle teams-only response', () => {
      const mockData: UsersAndTeamsData = {
        teams: [
          {
            id: '1',
            name: 'Standalone Team',
            is_guest: false,
            picture_url: 'https://example.com/team.jpg',
            owners: [
              {
                id: '1',
                name: 'Team Owner',
                email: 'owner@example.com',
              },
            ],
            users: [
              {
                id: '2',
                name: 'Team Member',
                email: 'member@example.com',
                title: 'Developer',
                is_admin: false,
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Teams:');
      expect(result).toContain('Standalone Team');
      expect(result).toContain('Owners:');
      expect(result).toContain('Team Owner');
      expect(result).toContain('Members:');
      expect(result).toContain('Team Member');
      expect(result).not.toContain('Users:'); // No separate Users section
    });
  });
});