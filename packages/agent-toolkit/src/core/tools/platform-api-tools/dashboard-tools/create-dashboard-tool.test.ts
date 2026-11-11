import { DashboardKind } from '../../../../monday-graphql/generated/graphql/graphql';
import { createMockApiClient } from '../test-utils/mock-api-client';
import { CreateDashboardTool, createDashboardToolSchema } from './create-dashboard-tool';

describe('Create Dashboard Tool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  describe('description', () => {
    const getDescription = () => new CreateDashboardTool(mocks.mockApiClient).getDescription();

    it('says the user must be an owner or member of the target workspace', () => {
      const description = getDescription();

      expect(description).toContain('owner or member');
      expect(description).toContain('workspace_id');
    });

    it('says creating a dashboard is stricter than creating a board', () => {
      expect(getDescription()).toContain('stricter than creating a board');
    });

    it('says a failure is usually a missing permission, not a transient error, so retrying the same workspace does not help', () => {
      const description = getDescription();

      expect(description).toContain('not a transient error');
      expect(description).toContain('do not retry with the same workspace_id');
    });

    it('keeps the original usage guidance', () => {
      expect(getDescription()).toContain('create a new monday.com dashboard');
    });
  });

  describe('input schema', () => {
    it('tells the caller the user must be an owner or member of the workspace', () => {
      expect(createDashboardToolSchema.workspace_id.description).toBe(
        'ID of the workspace that will own the dashboard. The user must be an owner or member of this workspace',
      );
    });
  });

  describe('execute', () => {
    it('creates a dashboard', async () => {
      mocks.setResponse({ create_dashboard: { id: '555', name: 'Sales' } });
      const tool = new CreateDashboardTool(mocks.mockApiClient);

      const result = await tool.execute({
        name: 'Sales',
        workspace_id: '10',
        board_ids: ['1', '2'],
        kind: DashboardKind.Public,
      });

      expect(result.content).toEqual({
        message: 'Dashboard 555 successfully created',
        dashboard_id: '555',
        dashboard_name: 'Sales',
      });
    });
  });
});
