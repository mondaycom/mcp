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
        logo: 'https://example.com/logo.png',
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

    expect(parsed.message).toBe('Account context');
    expect(parsed.account.id).toBe('12345');
    expect(parsed.account.name).toBe('Acme Corp');
    expect(parsed.account.slug).toBe('acme-corp');
    expect(parsed.account.tier).toBe('enterprise');
    expect(parsed.account.plan.tier).toBe('enterprise');
    expect(parsed.account.plan.period).toBe('yearly');
    expect(parsed.account.plan.max_users).toBe(500);
    expect(parsed.products).toEqual([
      { id: '1', kind: 'core', tier: 'enterprise', default_workspace_id: '100' },
      { id: '2', kind: 'crm', tier: 'enterprise', default_workspace_id: '200' },
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
          logo: null,
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

    expect(parsed.message).toBe('Account context');
    expect(parsed.account.id).toBe('99999');
    expect(parsed.account.name).toBe('Minimal Co');
    expect(parsed.account.plan).toBeNull();
    expect(parsed.products).toEqual([]);
  });

  it('should filter null entries from products array', async () => {
    const responseWithNullProducts: GetAccountContextQuery = {
      me: {
        account: {
          ...fullAccountResponse.me!.account,
          products: [
            null,
            { id: '1', kind: 'core', tier: 'pro', default_workspace_id: null },
            null,
            { id: null, kind: 'crm', tier: null, default_workspace_id: null },
          ],
        },
      },
    };

    mocks.setResponse(responseWithNullProducts);

    const result = await callToolByNameRawAsync('get_account_context', {});
    const parsed = parseToolResult(result);

    expect(parsed.products).toEqual([
      { id: '1', kind: 'core', tier: 'pro', default_workspace_id: null },
    ]);
  });

  it('should return auth error when me is null', async () => {
    mocks.setResponse({ me: null });

    const result = await callToolByNameRawAsync('get_account_context', {});

    expect(result.content[0].text).toBe(
      'AUTHENTICATION_ERROR: Unable to fetch account context. Verify API token and user permissions.',
    );
  });
});
