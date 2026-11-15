import { fetchBoardInfoV2 } from './get-board-info-v2';

describe('fetchBoardInfoV2 form views', () => {
  it('exposes formToken for form views and drops the raw view data string', async () => {
    const request = jest.fn().mockResolvedValue({
      boards: [
        {
          id: '123',
          name: 'Board',
          columns: [],
          views: [
            {
              id: 'form_1',
              name: 'Signup',
              type: 'FormBoardView',
              settings: {},
              filter: null,
              sort: null,
              view_specific_data_str: '{"token":"tok123","disabled":false}',
            },
            {
              id: 'table_1',
              name: 'Main',
              type: 'TableBoardView',
              settings: {},
              filter: null,
              sort: null,
              view_specific_data_str: '',
            },
          ],
        },
      ],
    });

    const outcome = await fetchBoardInfoV2({ request } as any, { boardId: 123 });

    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') {
      return;
    }
    expect(outcome.board.views[0].formToken).toBe('tok123');
    expect(outcome.board.views[1].formToken).toBeUndefined();
    expect(outcome.board.views.every((view) => !('view_specific_data_str' in view))).toBe(true);
  });
});
