import { jest } from '@jest/globals';
import { DEFAULT_API_VERSION, getMondaySchemaUrl, MONDAY_API_BASE_URL } from '../src/domains/atp/atp.consts';
import { loadMondaySchema } from '../src/domains/atp/atp.service';
import { API_VERSION } from '../../agent-toolkit/src/utils/version.utils';

describe('ATP API version', () => {
  it('matches the agent-toolkit API_VERSION', () => {
    expect(DEFAULT_API_VERSION).toBe(API_VERSION);
  });

  it('getMondaySchemaUrl() uses the toolkit version by default', () => {
    expect(getMondaySchemaUrl()).toBe(`https://api.monday.com/v2/get_schema?version=${API_VERSION}&format=sdl`);
  });

  it('getMondaySchemaUrl() uses an explicit version when given', () => {
    expect(getMondaySchemaUrl('2026-04')).toBe('https://api.monday.com/v2/get_schema?version=2026-04&format=sdl');
  });

  it('sends the toolkit version in the API-Version header by default', async () => {
    const loadGraphQL = jest.fn(async () => undefined);

    await loadMondaySchema({ loadGraphQL } as never, 'token');

    expect(loadGraphQL).toHaveBeenCalledWith(
      getMondaySchemaUrl(API_VERSION),
      expect.objectContaining({
        url: MONDAY_API_BASE_URL,
        headers: { Authorization: 'token', 'API-Version': API_VERSION },
      }),
    );
  });

  it('sends a caller-provided version in the schema URL and the API-Version header', async () => {
    const loadGraphQL = jest.fn(async () => undefined);

    await loadMondaySchema({ loadGraphQL } as never, 'token', '2026-04');

    expect(loadGraphQL).toHaveBeenCalledWith(
      getMondaySchemaUrl('2026-04'),
      expect.objectContaining({
        headers: { Authorization: 'token', 'API-Version': '2026-04' },
      }),
    );
  });
});
