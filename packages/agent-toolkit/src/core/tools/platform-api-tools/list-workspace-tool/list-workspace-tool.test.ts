import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../test-utils/mock-api-client';
import { listWorkspaceToolSchema } from './list-workspace-tool';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof listWorkspaceToolSchema, ZodTypeAny>;

const addDummyWorkspaces = (
  workspaces: { id: string; name: string; description: string }[],
  name: string,
  count: number,
) => {
  const maxId = Math.max(...workspaces.map((w) => parseInt(w.id)));
  for (let i = 1; i <= count; i++) {
    workspaces.push({
      id: `${maxId + i}`,
      name: `${name}-${i}`,
      description: `${name}-${i} description`,
    });
  }
  return workspaces;
};

describe('ListWorkspaceTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('No Workspaces Found', () => {
    it('should return "No workspaces found." when GraphQL query returns null workspaces', async () => {
      const response = {
        workspaces: null,
      };

      // Both member and all workspaces return null
      mocks.setResponses([response, response]);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(result.content[0].text).toBe('No workspaces found.');
      // Two calls: first member (empty), then all (also empty)
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[0]).toContain('query listWorkspaces');
      expect(firstCall[1]).toMatchObject({ membershipKind: 'member' });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[0]).toContain('query listWorkspaces');
      expect(secondCall[1]).toMatchObject({ membershipKind: 'all' });
    });

    it('should return "No workspaces found." when GraphQL query returns empty array', async () => {
      const response = {
        workspaces: [],
      };

      // Both member and all workspaces return empty array
      mocks.setResponses([response, response]);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(result.content[0].text).toBe('No workspaces found.');
      // Two calls: first member (empty), then all (also empty)
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[0]).toContain('query listWorkspaces');
      expect(firstCall[1]).toMatchObject({ membershipKind: 'member' });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[0]).toContain('query listWorkspaces');
      expect(secondCall[1]).toMatchObject({ membershipKind: 'all' });
    });
  });

  describe('Successful Flow Without SearchTerm', () => {
    it('should list workspaces without search term (basic case) using member-only query', async () => {
      const response = {
        workspaces: [
          { id: '123', name: 'Marketing Team', description: 'Marketing workspace' },
          { id: '456', name: 'Sales Team', description: 'Sales workspace' },
          { id: '789', name: 'Development', description: 'Dev workspace' },
        ],
      };

      mocks.setResponse(response);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 100,
        page: 1,
        membershipKind: 'member',
      });

      const content = result.content[0].text;
      expect(content).toContain('Showing workspaces you are a member of.');
      expect(content).toContain('• **Marketing Team** (ID: 123) - Marketing workspace');
      expect(content).toContain('• **Sales Team** (ID: 456) - Sales workspace');
      expect(content).toContain('• **Development** (ID: 789) - Dev workspace');
      expect(content).not.toContain('PAGINATION INFO');
    });

    it('should list workspaces without descriptions correctly', async () => {
      const response = {
        workspaces: [
          { id: '111', name: 'Workspace One', description: null },
          { id: '222', name: 'Workspace Two', description: null },
        ],
      };

      mocks.setResponse(response);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const content = result.content[0].text;
      expect(content).toContain('Showing workspaces you are a member of.');
      expect(content).toContain('• **Workspace One** (ID: 111)');
      expect(content).toContain('• **Workspace Two** (ID: 222)');
      // Verify no dash at the end when description is null
      expect(content).not.toContain('(ID: 111) -');
      expect(content).not.toContain('(ID: 222) -');
    });
  });

  describe('Successful Flow With SearchTerm', () => {
    it('should search workspaces with matching term when response has more than DEFAULT_WORKSPACE_LIMIT items', async () => {
      let workspaces = [
        { id: '1', name: 'Marketing Team', description: 'Marketing workspace' },
        { id: '2', name: 'Digital Marketing', description: 'Digital marketing workspace' },
        { id: '3', name: 'Sales Team', description: 'Sales workspace' },
        { id: '4', name: 'Development', description: 'Dev workspace' },
        { id: '5', name: 'HR Department', description: 'HR workspace' },
      ];
      // Add 96 more dummy workspaces to exceed DEFAULT_WORKSPACE_LIMIT (100)
      workspaces = addDummyWorkspaces(workspaces, 'Workspace', 96);

      const response = {
        workspaces,
      };

      mocks.setResponse(response);

      const args: inputType = {
        searchTerm: 'Marketing',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Only one call because match was found in member workspaces
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const content = result.content[0].text;
      expect(content).toContain('Showing workspaces you are a member of.');
      expect(content).toContain('• **Marketing Team** (ID: 1)');
      expect(content).toContain('• **Digital Marketing** (ID: 2)');
      expect(content).not.toContain('Sales Team');
      expect(content).not.toContain('Development');
      expect(content).not.toContain('HR Department');
      expect(content).not.toContain('IMPORTANT: Search term was not applied');
    });

    it('should search with special characters normalized when response has more than DEFAULT_WORKSPACE_LIMIT items', async () => {
      let workspaces = [
        { id: '1', name: 'Sales Marketing', description: 'Combined workspace' },
        { id: '2', name: 'SalesMarketing', description: 'No space version' },
        { id: '3', name: 'Development', description: 'Dev workspace' },
      ];
      // Add 98 more dummy workspaces to exceed DEFAULT_WORKSPACE_LIMIT (100)
      workspaces = addDummyWorkspaces(workspaces, 'Workspace', 98);

      const response = {
        workspaces,
      };

      mocks.setResponse(response);

      const args: inputType = {
        searchTerm: 'Sales & Marketing!',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Only one call because match was found in member workspaces
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const content = result.content[0].text;
      expect(content).toContain('• **Sales Marketing** (ID: 1)');
      expect(content).toContain('• **SalesMarketing** (ID: 2)');
      expect(content).not.toContain('Development');
      expect(content).not.toContain('IMPORTANT: Search term was not applied');
    });

    it('should not apply filtering when response has less than or equal to DEFAULT_WORKSPACE_LIMIT items', async () => {
      const response = {
        workspaces: [
          { id: '1', name: 'Marketing Team', description: 'Marketing workspace' },
          { id: '2', name: 'Digital Marketing', description: 'Digital marketing workspace' },
          { id: '3', name: 'Sales Team', description: 'Sales workspace' },
          { id: '4', name: 'Development', description: 'Dev workspace' },
          { id: '5', name: 'HR Department', description: 'HR workspace' },
        ],
      };

      mocks.setResponse(response);

      const args: inputType = {
        searchTerm: 'Marketing',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Only one call because matches were found in member workspaces
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const content = result.content[0].text;
      // Should include all workspaces, not just matching ones
      expect(content).toContain('Showing workspaces you are a member of.');
      expect(content).toContain('• **Marketing Team** (ID: 1)');
      expect(content).toContain('• **Digital Marketing** (ID: 2)');
      expect(content).toContain('• **Sales Team** (ID: 3)');
      expect(content).toContain('• **Development** (ID: 4)');
      expect(content).toContain('• **HR Department** (ID: 5)');
      // Should include disclaimer that filtering was not applied
      expect(content).toContain(
        'IMPORTANT: Search term not applied - returning all workspaces. Perform the filtering manually.',
      );
    });

    it('should fallback to all workspaces when search term not found in member workspaces', async () => {
      const memberWorkspaces = [
        { id: '1', name: 'Marketing Team', description: 'Marketing workspace' },
        { id: '2', name: 'Sales Team', description: 'Sales workspace' },
      ];

      let allWorkspaces = [
        { id: '1', name: 'Marketing Team', description: 'Marketing workspace' },
        { id: '2', name: 'Sales Team', description: 'Sales workspace' },
        { id: '3', name: 'Engineering Team', description: 'Engineering workspace' },
        { id: '4', name: 'Engineering Infra', description: 'Infra workspace' },
      ];
      // Add more workspaces to exceed DEFAULT_WORKSPACE_LIMIT (100)
      allWorkspaces = addDummyWorkspaces(allWorkspaces, 'Workspace', 97);

      // First call returns member workspaces (no match for "Engineering")
      // Second call returns all workspaces (has match for "Engineering")
      mocks.setResponses([{ workspaces: memberWorkspaces }, { workspaces: allWorkspaces }]);

      const args: inputType = {
        searchTerm: 'Engineering',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Two calls: first member, then all
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[0]).toContain('query listWorkspaces');
      expect(firstCall[1]).toMatchObject({ membershipKind: 'member' });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[0]).toContain('query listWorkspaces');
      expect(secondCall[1]).toMatchObject({ membershipKind: 'all' });

      const content = result.content[0].text;
      // Should NOT show member-only note since we fell back to all
      expect(content).not.toContain('Showing workspaces you are a member of.');
      expect(content).toContain('• **Engineering Team** (ID: 3)');
      expect(content).toContain('• **Engineering Infra** (ID: 4)');
      expect(content).not.toContain('Marketing Team');
      expect(content).not.toContain('Sales Team');
    });
  });

  describe('Unsuccessful Flow - SearchTerm Not Including Alphanumeric Characters', () => {
    it('should return error when search term contains only special characters', async () => {
      const args: inputType = {
        searchTerm: '!@#$%',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(result.content[0].text).toBe(
        'Failed to execute tool list_workspaces: Search term did not include any alphanumeric characters. Please provide a valid search term.',
      );
      expect(mocks.getMockRequest()).not.toHaveBeenCalled();
    });
  });

  describe('Unsuccessful Flow - SearchTerm Not Finding Anything', () => {
    it('should return "no matches" message when search finds no results in either member or all workspaces', async () => {
      let workspaces = [
        { id: '1', name: 'Marketing Team', description: 'Marketing workspace' },
        { id: '2', name: 'Sales Team', description: 'Sales workspace' },
        { id: '3', name: 'Development', description: 'Dev workspace' },
        { id: '4', name: 'HR Department', description: 'HR workspace' },
        { id: '5', name: 'Finance', description: 'Finance workspace' },
      ];
      // Add 96 more dummy workspaces to exceed DEFAULT_WORKSPACE_LIMIT (100)
      workspaces = addDummyWorkspaces(workspaces, 'Workspace', 96);

      const response = {
        workspaces,
      };

      // Both member and all workspaces return the same response (no match)
      mocks.setResponses([response, response]);

      const args: inputType = {
        searchTerm: 'NonexistentWorkspace',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(result.content[0].text).toBe(
        'No workspaces found matching the search term. Try using the tool without a search term',
      );
      // Two calls: first member (no match), then all (still no match)
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[0]).toContain('query listWorkspaces');
      expect(firstCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[0]).toContain('query listWorkspaces');
      expect(secondCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'all',
      });
    });
  });
});
