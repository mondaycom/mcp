import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getAccountContextQuery } from './get-account-context.graphql';
import { GetAccountContextQuery } from '../../../../monday-graphql/generated/graphql/graphql';

export class GetAccountContextTool extends BaseMondayApiTool<undefined> {
  name = 'get_account_context';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Account Context',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return (
      "Fetch the current user's account information including account identity, plan details, active products, and configuration. " +
      'Use this tool when you need to: ' +
      'identify which account the user belongs to (id, name, slug), ' +
      "check the account's plan tier, billing period, or user limits (max_users), " +
      'count how many people/members are in the account (returns active_members_count — PREFERRED over listing users when only the count is needed), ' +
      'discover which products are active (core, CRM, software, service, marketing, forms, whiteboard), ' +
      'determine trial status (is_during_trial, is_trial_expired), ' +
      'or get account-level settings (first_day_of_the_week, show_timeline_weekends, country_code).'
    );
  }

  getInputSchema(): undefined {
    return undefined;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    const { me } = await this.mondayApi.request<GetAccountContextQuery>(getAccountContextQuery, {});

    if (!me) {
      return {
        content: 'AUTHENTICATION_ERROR: Unable to fetch account context. Verify API token and user permissions.',
      };
    }

    return {
      content: me.account,
    };
  }
}
