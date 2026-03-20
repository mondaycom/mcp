import { z, ZodTypeAny } from 'zod';
import { MondayAgentToolkit } from 'src/mcp/toolkit';
import { callToolByNameRawAsync, createMockApiClient } from '../../test-utils/mock-api-client';
import { createFormToolSchema } from './schema';

type inputType = z.objectInputType<typeof createFormToolSchema, ZodTypeAny>;

describe('CreateFormTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockApiClient();
    jest.spyOn(MondayAgentToolkit.prototype as any, 'createApiClient').mockReturnValue(mocks.mockApiClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the 2025-10 API version override when creating a form', async () => {
    mocks.setResponse({
      create_form: {
        boardId: 'board_123',
        token: 'form_token_123',
      },
    });

    const args: inputType = {
      destination_workspace_id: '12345',
      destination_name: 'Test Form',
    };

    const result = await callToolByNameRawAsync('create_form', args);

    expect(JSON.parse(result.content[0].text)).toEqual({
      message: 'Form created successfully',
      board_id: 'board_123',
      form_token: 'form_token_123',
    });

    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(1);

    const mockCall = mocks.getMockRequest().mock.calls[0];
    expect(mockCall[0]).toContain('mutation createForm');
    expect(mockCall[1]).toEqual({
      destination_workspace_id: '12345',
      destination_folder_id: undefined,
      destination_folder_name: undefined,
      board_kind: undefined,
      destination_name: 'Test Form',
      board_owner_ids: undefined,
      board_owner_team_ids: undefined,
      board_subscriber_ids: undefined,
      board_subscriber_teams_ids: undefined,
    });
    expect(mockCall[2]).toEqual(expect.objectContaining({ versionOverride: '2025-10' }));
  });
});
