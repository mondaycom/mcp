import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
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

const mockSlugResponse = { me: { account: { slug: 'test-account' } } };

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

      const parsed = parseToolResult(result);
      expect(parsed.message).toBe('No workspaces found.');
      expect(parsed.data).toEqual([]);
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

      const parsed = parseToolResult(result);
      expect(parsed.message).toBe('No workspaces found.');
      expect(parsed.data).toEqual([]);
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

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 100,
        page: 1,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      expect(parsed.message).toBe('Workspaces retrieved');
      expect(parsed.data).toHaveLength(3);
      expect(parsed.data.find((w: any) => w.id === '123').name).toBe('Marketing Team');
      expect(parsed.data.find((w: any) => w.id === '456').name).toBe('Sales Team');
      expect(parsed.data.find((w: any) => w.id === '789').name).toBe('Development');
      expect(parsed.next_page).toBeUndefined();
    });

    it('should list workspaces without descriptions correctly', async () => {
      const response = {
        workspaces: [
          { id: '111', name: 'Workspace One', description: null },
          { id: '222', name: 'Workspace Two', description: null },
        ],
      };

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const parsed = parseToolResult(result);
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data.find((w: any) => w.id === '111').name).toBe('Workspace One');
      expect(parsed.data.find((w: any) => w.id === '222').name).toBe('Workspace Two');
      // Descriptions should be undefined when null
      expect(parsed.data.find((w: any) => w.id === '111').description).toBeUndefined();
      expect(parsed.data.find((w: any) => w.id === '222').description).toBeUndefined();
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

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = {
        searchTerm: 'Marketing',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Two calls: workspaces + slug
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      const names = parsed.data.map((w: any) => w.name);
      expect(names).toContain('Marketing Team');
      expect(names).toContain('Digital Marketing');
      expect(names).not.toContain('Sales Team');
      expect(names).not.toContain('Development');
      expect(names).not.toContain('HR Department');
      expect(parsed.disclaimer).toBeUndefined();
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

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = {
        searchTerm: 'Sales & Marketing!',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Two calls: workspaces + slug
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      const names = parsed.data.map((w: any) => w.name);
      expect(names).toContain('Sales Marketing');
      expect(names).toContain('SalesMarketing');
      expect(names).not.toContain('Development');
      expect(parsed.disclaimer).toBeUndefined();
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

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = {
        searchTerm: 'Marketing',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Two calls: workspaces + slug
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(2);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[0]).toContain('query listWorkspaces');
      expect(mockCall[1]).toEqual({
        limit: 10000,
        page: 1,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      // Should include all workspaces, not just matching ones
      const names = parsed.data.map((w: any) => w.name);
      expect(names).toContain('Marketing Team');
      expect(names).toContain('Digital Marketing');
      expect(names).toContain('Sales Team');
      expect(names).toContain('Development');
      expect(names).toContain('HR Department');
      // Should include disclaimer that filtering was not applied
      expect(parsed.disclaimer).toBe(
        'Search term not applied - returning all workspaces. Perform the filtering manually.',
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

      // First call: member workspaces (no match for "Engineering")
      // Second call: all workspaces (has match for "Engineering")
      // Third call: fetchAccountSlug
      mocks.setResponses([{ workspaces: memberWorkspaces }, { workspaces: allWorkspaces }, mockSlugResponse]);

      const args: inputType = {
        searchTerm: 'Engineering',
      };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      // Three calls: member, all, slug
      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[0]).toContain('query listWorkspaces');
      expect(firstCall[1]).toMatchObject({ membershipKind: 'member' });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[0]).toContain('query listWorkspaces');
      expect(secondCall[1]).toMatchObject({ membershipKind: 'all' });

      const parsed = parseToolResult(result);
      const names = parsed.data.map((w: any) => w.name);
      expect(names).toContain('Engineering Team');
      expect(names).toContain('Engineering Infra');
      expect(names).not.toContain('Marketing Team');
      expect(names).not.toContain('Sales Team');
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

      const parsed = parseToolResult(result);
      expect(parsed.message).toBe('No workspaces found matching the search term. Try using the tool without a search term');
      expect(parsed.data).toEqual([]);
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
