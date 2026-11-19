import { ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { ONBOARDING_GUIDE } from './onboarding-guide';

export class OnboardToMondayTool extends BaseMondayApiTool<undefined> {
  name = 'onboard_to_monday';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Onboard to monday.com',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return `Get monday's recommended first-run guide for a user who is new to monday.com.

    Call this when the user is new to monday.com or asks for help getting started, for example "I'm new to monday", "help me get started", "set up monday for me", or "onboard me".
    The guide walks through learning the user's work, previewing and creating their first board, adding a starter automation, and an optional dashboard.
    It returns guidance only and changes nothing in the account.
    `;
  }

  getInputSchema(): undefined {
    return undefined;
  }

  protected async executeInternal(): Promise<ToolOutputType<never>> {
    return { content: ONBOARDING_GUIDE };
  }
}
