import { createMockApiClient } from '../test-utils/mock-api-client';
import { OnboardToMondayTool } from './onboard-to-monday-tool';
import { ONBOARDING_GUIDE } from './onboarding-guide';

describe('OnboardToMondayTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
    jest.clearAllMocks();
  });

  it('returns the onboarding guide without calling the API', async () => {
    const tool = new OnboardToMondayTool(mocks.mockApiClient);

    const result = await tool.execute();

    expect(result.content).toBe(ONBOARDING_GUIDE);
    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });

  it('is a read-only tool with no input', () => {
    const tool = new OnboardToMondayTool(mocks.mockApiClient);

    expect(tool.name).toBe('onboard_to_monday');
    expect(tool.getInputSchema()).toBeUndefined();
    expect(tool.annotations.readOnlyHint).toBe(true);
    expect(tool.annotations.destructiveHint).toBe(false);
  });

  it('keeps the guide steps that previously went missing', () => {
    expect(ONBOARDING_GUIDE).toContain('show-table-preview');
    expect(ONBOARDING_GUIDE).toContain('create_automation');
    expect(ONBOARDING_GUIDE).toContain('create_dashboard');
    expect(ONBOARDING_GUIDE.indexOf('**Automation.**')).toBeLessThan(ONBOARDING_GUIDE.indexOf('**Dashboard'));
  });
});
