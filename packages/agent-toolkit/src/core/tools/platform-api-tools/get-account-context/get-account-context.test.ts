import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient, parseToolResult } from '../test-utils/mock-api-client';
import { GetAccountContextQuery } from 'src/monday-graphql/generated/graphql/graphql';
import { FirstDayOfTheWeek } from 'src/monday-graphql/generated/graphql/graphql';

describe('GetAccountContextTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  const fullAccountResponse: GetAccountContextQuery = {
    me: {
      account: {
        id: '12345',
        name: 'Acme Corp',
        slug: 'acme-corp',
        tier: 'enterprise',
        country_code: 'US',
        created_at: '2023-01-15',
        first_day_of_the_week: FirstDayOfTheWeek.Monday,
        active_members_count: 150,
        is_during_trial: false,
        is_trial_expired: false,
        show_timeline_weekends: false,
        sign_up_product_kind: 'core',
        plan: {
          tier: 'enterprise',
          period: 'yearly',
          max_users: 500,
          version: 3,
        },
        products: [
          { id: '1', kind: 'core', tier: 'enterprise', default_workspace_id: '100' },
          { id: '2', kind: 'crm', tier: 'enterprise', default_workspace_id: '200' },
          null,
        ],
      },
    },
  };

  it('should fetch full account context with plan and products', async () => {
    mocks.setResponse(fullAccountResponse);

    const result = await callToolByNameRawAsync('get_account_context', {});
    const parsed = parseToolResult(result);

    expect(parsed.id).toBe('12345');
    expect(parsed.name).toBe('Acme Corp');
    expect(parsed.slug).toBe('acme-corp');
    expect(parsed.tier).toBe('enterprise');
    expect(parsed.plan.tier).toBe('enterprise');
    expect(parsed.plan.period).toBe('yearly');
    expect(parsed.plan.max_users).toBe(500);
    expect(parsed.products).toEqual([
      { id: '1', kind: 'core', tier: 'enterprise', default_workspace_id: '100' },
      { id: '2', kind: 'crm', tier: 'enterprise', default_workspace_id: '200' },
      null,
    ]);
  });

  it('should handle account with minimal/null optional fields', async () => {
    const minimalResponse: GetAccountContextQuery = {
      me: {
        account: {
          id: '99999',
          name: 'Minimal Co',
          slug: 'minimal-co',
          tier: null,
          country_code: null,
          created_at: null,
          first_day_of_the_week: FirstDayOfTheWeek.Sunday,
          active_members_count: null,
          is_during_trial: null,
          is_trial_expired: null,
          show_timeline_weekends: true,
          sign_up_product_kind: null,
          plan: null,
          products: null,
        },
      },
    };

    mocks.setResponse(minimalResponse);

    const result = await callToolByNameRawAsync('get_account_context', {});
    const parsed = parseToolResult(result);

    expect(parsed.id).toBe('99999');
    expect(parsed.name).toBe('Minimal Co');
    expect(parsed.plan).toBeNull();
    expect(parsed.products).toBeNull();
  });

  it('should return auth error when me is null', async () => {
    mocks.setResponse({ me: null });

    const result = await callToolByNameRawAsync('get_account_context', {});

    expect(result.content[0].text).toBe(
      'AUTHENTICATION_ERROR: Unable to fetch account context. Verify API token and user permissions.',
    );
  });

  it('should handle GraphQL error', async () => {
    mocks.setError('Unauthorized');
    const result = await callToolByNameRawAsync('get_account_context', {});
    expect(result.content[0].text).toBe('Failed to execute tool get_account_context: Unauthorized');
  });
});
