import { formatUsersAndTeams } from './helpers';
import { FormattedResponse } from './types';

describe('ListUsersAndTeamsTool - Helper Functions', () => {
  describe('formatUsersAndTeams', () => {
    it('should format users and teams data correctly', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Luke Skywalker',
            title: 'Jedi Knight',
            email: 'luke@rebelalliance.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '1977-05-25',
            last_activity: '1983-05-25',
            location: 'Tatooine',
            mobile_phone: '+1234567890',
            phone: '+1234567890',
            photo_thumb: 'https://starwars.com/luke.jpg',
            time_zone_identifier: 'Tatooine/Binary_Sunset',
            utc_hours_diff: -5,
            teams: [
              {
                id: '1',
                name: 'Rebel Alliance',
                is_guest: false,
              },
            ],
          },
        ],
        teams: [
          {
            id: '1',
            name: 'Rebel Alliance',
            is_guest: false,
            picture_url: 'https://starwars.com/rebellion.jpg',
            owners: [
              {
                id: '2',
                name: 'Princess Leia',
                email: 'leia@rebelalliance.com',
              },
            ],
            users: [
              {
                id: '1',
                name: 'Luke Skywalker',
                email: 'luke@rebelalliance.com',
                title: 'Jedi Knight',
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
      expect(result).toContain('Name: Luke Skywalker');
      expect(result).toContain('Email: luke@rebelalliance.com');
      expect(result).toContain('Title: Jedi Knight');
      expect(result).toContain('Enabled: true');
      expect(result).toContain('Admin: false');
      expect(result).toContain('Guest: false');
      expect(result).toContain('Pending: false');
      expect(result).toContain('Verified: true');
      expect(result).toContain('View Only: false');
      expect(result).toContain('Join Date: 1977-05-25');
      expect(result).toContain('Last Activity: 1983-05-25');
      expect(result).toContain('Location: Tatooine');
      expect(result).toContain('Mobile Phone: +1234567890');
      expect(result).toContain('Phone: +1234567890');
      expect(result).toContain('Timezone: Tatooine/Binary_Sunset');
      expect(result).toContain('UTC Hours Diff: -5');
      expect(result).toContain('Teams:');
      expect(result).toContain('- ID: 1, Name: Rebel Alliance, Guest Team: false');

      // Test teams section
      expect(result).toContain('Teams:');
      expect(result).toContain('Picture URL: https://starwars.com/rebellion.jpg');
      expect(result).toContain('Owners:');
      expect(result).toContain('- ID: 2, Name: Princess Leia, Email: leia@rebelalliance.com');
      expect(result).toContain('Members:');
      expect(result).toContain(
        '- ID: 1, Name: Luke Skywalker, Email: luke@rebelalliance.com, Title: Jedi Knight, Admin: false, Guest: false',
      );
    });

    it('should handle users without teams', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Obi-Wan Kenobi',
            title: 'Hermit',
            email: 'obiwan@exile.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '1977-05-25',
            last_activity: '1983-05-25',
            location: 'Tatooine Desert',
            mobile_phone: '+9876543210',
            phone: '+9876543210',
            photo_thumb: 'https://starwars.com/obiwan.jpg',
            time_zone_identifier: 'Tatooine/Binary_Sunset',
            utc_hours_diff: -5,
            teams: null,
          },
        ],
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Obi-Wan Kenobi');
      expect(result).not.toContain('Teams:');
    });

    it('should handle teams without members or owners', () => {
      const mockData: FormattedResponse = {
        users: null,
        teams: [
          {
            id: '1',
            name: 'Abandoned Jedi Temple',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Teams:');
      expect(result).toContain('Abandoned Jedi Temple');
      expect(result).toContain('Picture URL: N/A');
      expect(result).not.toContain('Owners:');
      expect(result).not.toContain('Members:');
    });

    it('should handle null values gracefully', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Han Solo',
            title: null,
            email: 'han@smuggler.com',
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

      expect(result).toContain('Han Solo');
      expect(result).toContain('Title: N/A');
      expect(result).toContain('Admin: false');
      expect(result).toContain('Join Date: N/A');
      expect(result).toContain('Location: N/A');
      expect(result).toContain('Mobile Phone: N/A');
      expect(result).toContain('Timezone: N/A');
      expect(result).toContain('UTC Hours Diff: N/A');
    });

    it('should return appropriate message for empty data', () => {
      const mockData: FormattedResponse = {
        users: null,
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toBe('No users or teams found with the specified filters.');
    });

    it('should handle empty arrays', () => {
      const mockData: FormattedResponse = {
        users: [],
        teams: [],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toBe('No users or teams found with the specified filters.');
    });

    it('should handle multiple users and teams', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Anakin Skywalker',
            title: 'Padawan',
            email: 'anakin@jediorder.com',
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
            name: 'Yoda',
            title: 'Grand Master',
            email: 'yoda@jedicouncil.com',
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
            name: 'Jedi Order',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
          {
            id: '2',
            name: 'Jedi Council',
            is_guest: false,
            picture_url: null,
            owners: [],
            users: null,
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Anakin Skywalker');
      expect(result).toContain('Yoda');
      expect(result).toContain('Jedi Order');
      expect(result).toContain('Jedi Council');
    });

    it('should handle large account scenarios with limits', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Emperor Palpatine',
            title: 'Sith Lord',
            email: 'emperor@empire.gov',
            enabled: true,
            is_admin: true,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '1977-05-25',
            last_activity: '1983-05-25',
            location: 'Death Star',
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: 'Imperial/Standard_Time',
            utc_hours_diff: 0,
            teams: [
              {
                id: '1',
                name: 'Galactic Empire',
                is_guest: false,
              },
            ],
          },
        ],
        teams: null,
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Emperor Palpatine');
      expect(result).toContain('Admin: true');
      expect(result).toContain('Galactic Empire');
    });

    it('should handle users-only response (default behavior)', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'C-3PO',
            title: 'Protocol Droid',
            email: 'c3po@droids.com',
            enabled: true,
            is_admin: false,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '1977-05-25',
            last_activity: '1983-05-25',
            location: 'Echo Base',
            mobile_phone: null,
            phone: null,
            photo_thumb: null,
            time_zone_identifier: 'Hoth/Ice_Planet',
            utc_hours_diff: -5,
            teams: [
              {
                id: '1',
                name: 'Droids Division',
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Users:');
      expect(result).toContain('C-3PO');
      expect(result).toContain('Protocol Droid');
      expect(result).toContain('c3po@droids.com');
      expect(result).toContain('Teams:');
      expect(result).toContain('Droids Division');
      // Should not contain a separate Teams section
      expect(result.split('Teams:').length).toBe(2); // Only one "Teams:" for user's teams
    });

    it('should handle teams-only response', () => {
      const mockData: FormattedResponse = {
        teams: [
          {
            id: '1',
            name: 'Rogue Squadron',
            is_guest: false,
            picture_url: 'https://starwars.com/rogue-squadron.jpg',
            owners: [
              {
                id: '1',
                name: 'Wedge Antilles',
                email: 'wedge@rebelalliance.com',
              },
            ],
            users: [
              {
                id: '2',
                name: 'Biggs Darklighter',
                email: 'biggs@rebelalliance.com',
                title: 'X-wing Pilot',
                is_admin: false,
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Teams:');
      expect(result).toContain('Rogue Squadron');
      expect(result).toContain('Owners:');
      expect(result).toContain('Wedge Antilles');
      expect(result).toContain('Members:');
      expect(result).toContain('Biggs Darklighter');
      expect(result).not.toContain('Users:'); // No separate Users section
    });

    it('should handle efficient teams-only response (no member details)', () => {
      const mockData: FormattedResponse = {
        teams: [
          {
            id: '1',
            name: 'Death Star Command',
            // Only id and name - minimal BaseTeam structure for efficient queries
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Teams:');
      expect(result).toContain('Death Star Command');
      expect(result).toContain('ID: 1');
      expect(result).toContain('Name: Death Star Command');
      expect(result).not.toContain('Guest Team:'); // No guest info in minimal structure
      expect(result).not.toContain('Picture URL:'); // No picture in minimal structure
      expect(result).not.toContain('Owners:'); // No owners section
      expect(result).not.toContain('Members:'); // No members section
      expect(result).not.toContain('Users:'); // No separate Users section
    });

    it('should handle single user response for getMe functionality', () => {
      const mockData: FormattedResponse = {
        users: [
          {
            id: '1',
            name: 'Master Yoda',
            title: 'Grand Master',
            email: 'yoda@jedicouncil.com',
            enabled: true,
            is_admin: true,
            is_guest: false,
            is_pending: false,
            is_verified: true,
            is_view_only: false,
            join_date: '0001-01-01',
            last_activity: '2024-01-01',
            location: 'Dagobah',
            mobile_phone: null,
            phone: null,
            photo_thumb: 'https://starwars.com/yoda.jpg',
            time_zone_identifier: 'Dagobah/Swamp_Time',
            utc_hours_diff: 0,
            teams: [
              {
                id: '1',
                name: 'Jedi Council',
                is_guest: false,
              },
            ],
          },
        ],
      };

      const result = formatUsersAndTeams(mockData);

      expect(result).toContain('Users:');
      expect(result).toContain('Master Yoda');
      expect(result).toContain('Grand Master');
      expect(result).toContain('yoda@jedicouncil.com');
      expect(result).toContain('Admin: true');
      expect(result).toContain('Jedi Council');
      // Should contain Teams: for user's team memberships, but only one instance (not a separate Teams section)
      expect(result.split('Teams:').length).toBe(2); // Only one "Teams:" for user's teams
    });
  });
});
