import { UpdateColumnTool } from './update-column-tool';

function createMockApiClient() {
  const mockRequest = jest.fn();
  return {
    mockApiClient: { request: mockRequest } as any,
    mockRequest,
    setResponses: (responses: any[]) => {
      responses.forEach((response) => {
        mockRequest.mockResolvedValueOnce(response);
      });
    },
    getMockRequest: () => mockRequest,
  };
}

describe('UpdateColumnTool', () => {
  let mocks: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mocks = createMockApiClient();
  });

  it('retries once after REVISION_MISMATCH', async () => {
    const revisionMismatchError = Object.assign(new Error('Board revision mismatch'), {
      response: {
        errors: [{ message: 'Board revision mismatch', extensions: { code: 'REVISION_MISMATCH', status_code: 409 } }],
        data: { update_column: null },
        status: 200,
        headers: {},
      },
    });

    mocks.getMockRequest().mockRejectedValueOnce(revisionMismatchError);
    mocks.setResponses([
      {
        boards: [{ columns: [{ id: 'relation_col', revision: 'fresh-rev' }] }],
      },
      {
        update_column: { id: 'relation_col', title: 'Relation', revision: 'new-rev' },
      },
    ]);

    const tool = new UpdateColumnTool(mocks.mockApiClient);
    const result = await tool.execute({
      boardId: 456,
      columnId: 'relation_col',
      columnType: 'board_relation' as any,
      revision: 'stale-rev',
      columnSettings: JSON.stringify({ boardIds: [789], allowMultipleItems: true }),
    });

    expect((result.content as any).revision).toBe('new-rev');
    expect((result.content as any).warnings).toEqual(
      expect.arrayContaining(['Retried update_column after REVISION_MISMATCH using a fresh revision.']),
    );
    expect(mocks.getMockRequest()).toHaveBeenCalledTimes(3);
  });

  it('sanitizes status label descriptions before calling the API', async () => {
    mocks.setResponses([
      {
        update_column: { id: 'status_col', title: 'Status', revision: 'rev-2' },
      },
    ]);

    const tool = new UpdateColumnTool(mocks.mockApiClient);
    const longDescription = 'x'.repeat(100);
    await tool.execute({
      boardId: 123,
      columnId: 'status_col',
      columnType: 'status' as any,
      revision: 'rev-1',
      columnSettings: JSON.stringify({
        labels: [{ label: 'Verified', description: longDescription, color: 'grass_green', index: 0 }],
      }),
    });

    const updateCall = mocks.getMockRequest().mock.calls[0];
    expect(updateCall[1].columnSettings.labels[0].description).toHaveLength(80);
  });

  it('converts dropdown label additions to MODIFY_LABELS actions', async () => {
    mocks.setResponses([
      {
        update_column: { id: 'dropdown_col', title: 'Dropdown', revision: 'rev-2' },
      },
    ]);

    const tool = new UpdateColumnTool(mocks.mockApiClient);
    await tool.execute({
      boardId: 123,
      columnId: 'dropdown_col',
      columnType: 'dropdown' as any,
      revision: 'rev-1',
      columnSettings: JSON.stringify({
        labels: [{ id: 1, label: 'Existing', is_deactivated: false }, { label: 'TARA', is_deactivated: false }],
      }),
    });

    const updateCall = mocks.getMockRequest().mock.calls[0];
    expect(updateCall[1].columnSettings.action).toEqual({
      type: 'MODIFY_LABELS',
      payload: [{ type: 'CREATE', label: { name: 'TARA' } }],
    });
    expect(updateCall[1].columnSettings.labels).toBeUndefined();
  });

  it('rejects item value updates with a helpful error', async () => {
    const tool = new UpdateColumnTool(mocks.mockApiClient);

    await expect(
      tool.execute({
        boardId: 123,
        columnId: 'status_col',
        columnType: 'status' as any,
        revision: 'rev-1',
        itemId: 456,
        value: { label: 'Done' },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_TOOL_ARGS',
      message: expect.stringContaining('change_item_column_values'),
    });

    expect(mocks.getMockRequest()).not.toHaveBeenCalled();
  });
});
