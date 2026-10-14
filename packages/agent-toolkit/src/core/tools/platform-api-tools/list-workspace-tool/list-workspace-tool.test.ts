import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { listWorkspaceToolSchema } from './list-workspace-tool';
import { z, ZodTypeAny } from 'zod';

export type inputType = z.objectInputType<typeof listWorkspaceToolSchema, ZodTypeAny>;

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

  describe('Successful Flow', () => {
    it('should list workspaces using member-only query', async () => {
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
      expect(parsed.data.find((w: any) => w.id === '111').description).toBeUndefined();
      expect(parsed.data.find((w: any) => w.id === '222').description).toBeUndefined();
    });

    it('should indicate next_page when results equal limit', async () => {
      const response = {
        workspaces: Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Workspace ${i + 1}`,
          description: null,
        })),
      };

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = { limit: 10, page: 1 };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toEqual({
        limit: 10,
        page: 1,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      expect(parsed.data).toHaveLength(10);
      expect(parsed.next_page).toBe(2);
    });

    it('should pass page parameter to the API for pagination', async () => {
      const response = {
        workspaces: Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 11}`,
          name: `Workspace ${i + 11}`,
          description: null,
        })),
      };

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = { limit: 10, page: 2 };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      const mockCall = mocks.getMockRequest().mock.calls[0];
      expect(mockCall[1]).toEqual({
        limit: 10,
        page: 2,
        membershipKind: 'member',
      });

      const parsed = parseToolResult(result);
      expect(parsed.data).toHaveLength(10);
      expect(parsed.data[0].name).toBe('Workspace 11');
      expect(parsed.next_page).toBe(3);
    });

    it('should not indicate next_page when results are fewer than limit', async () => {
      const response = {
        workspaces: [
          { id: '1', name: 'Only Workspace', description: null },
        ],
      };

      mocks.setResponses([response, mockSlugResponse]);

      const args: inputType = { limit: 10, page: 1 };

      const result = await callToolByNameRawAsync('list_workspaces', args);

      const parsed = parseToolResult(result);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.next_page).toBeUndefined();
    });

    it('should fallback to all workspaces when member workspaces are empty', async () => {
      const allWorkspaces = {
        workspaces: [
          { id: '1', name: 'Public Workspace', description: 'Visible to all' },
        ],
      };

      mocks.setResponses([{ workspaces: [] }, allWorkspaces, mockSlugResponse]);

      const args: inputType = {};

      const result = await callToolByNameRawAsync('list_workspaces', args);

      expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);

      const firstCall = mocks.getMockRequest().mock.calls[0];
      expect(firstCall[1]).toMatchObject({ membershipKind: 'member' });

      const secondCall = mocks.getMockRequest().mock.calls[1];
      expect(secondCall[1]).toMatchObject({ membershipKind: 'all' });

      const parsed = parseToolResult(result);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].name).toBe('Public Workspace');
    });
  });
});
