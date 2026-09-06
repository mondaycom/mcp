import axios from 'axios';
import { resolveFormToken } from './form-token';

jest.mock('axios');

const mockAxiosHead = axios.head as jest.Mock;

const VALID_TOKEN = 'aaaaaaaa000000000000000000000123';

describe('resolveFormToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a bare token', async () => {
    await expect(resolveFormToken(VALID_TOKEN)).resolves.toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('accepts an uppercase token', async () => {
    const upper = VALID_TOKEN.toUpperCase();

    await expect(resolveFormToken(upper)).resolves.toEqual({ ok: true, token: upper });
  });

  it('trims surrounding whitespace', async () => {
    await expect(resolveFormToken(`  ${VALID_TOKEN}\n`)).resolves.toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('extracts the token from a full form URL', async () => {
    const result = await resolveFormToken(`https://forms.monday.com/forms/${VALID_TOKEN}?r=use1&foo=bar`);

    expect(result).toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('extracts the token from a form URL with a fragment', async () => {
    const result = await resolveFormToken(`https://forms.monday.com/forms/${VALID_TOKEN}#top`);

    expect(result).toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('extracts the token from a form URL without a protocol', async () => {
    const result = await resolveFormToken(`forms.monday.com/forms/${VALID_TOKEN}`);

    expect(result).toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('follows a wkf.ms short link', async () => {
    mockAxiosHead.mockResolvedValue({ headers: { location: `https://forms.monday.com/forms/${VALID_TOKEN}?r=use1` } });

    const result = await resolveFormToken('https://wkf.ms/exampleAbc');

    expect(mockAxiosHead).toHaveBeenCalledWith('https://wkf.ms/exampleAbc', expect.objectContaining({ maxRedirects: 0 }));
    expect(result).toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('adds a protocol to a bare wkf.ms short link before following it', async () => {
    mockAxiosHead.mockResolvedValue({ headers: { location: `https://forms.monday.com/forms/${VALID_TOKEN}` } });

    const result = await resolveFormToken('wkf.ms/exampleXyz');

    expect(mockAxiosHead).toHaveBeenCalledWith('https://wkf.ms/exampleXyz', expect.objectContaining({ maxRedirects: 0 }));
    expect(result).toEqual({ ok: true, token: VALID_TOKEN });
  });

  it('rejects a short link whose redirect is missing', async () => {
    mockAxiosHead.mockResolvedValue({ headers: {} });

    const result = await resolveFormToken('https://wkf.ms/exampleAbc');

    expect(result).toMatchObject({ ok: false });
  });

  it('rejects a short link that cannot be reached', async () => {
    mockAxiosHead.mockRejectedValue(new Error('ENOTFOUND'));

    const result = await resolveFormToken('https://wkf.ms/exampleAbc');

    expect(result).toMatchObject({ ok: false });
  });

  it.each([
    ['a numeric form id', '279015847'],
    ['a bare bitly slug', '4cVjgJm'],
    ['a placeholder', 'test'],
    ['a truncated token', '0b84f0f8'],
    ['an ObjectId-shaped value', '68ee5d611c261cc35c52e41b'],
    ['a non-hex 18-char string', 'abc123def456ghi789'],
    ['an unrelated URL', 'https://bit.ly/somelink'],
    ['an empty string', ''],
  ])('rejects %s', async (_label, value) => {
    const result = await resolveFormToken(value);

    expect(result).toMatchObject({ ok: false });
    expect((result as { message: string }).message).toContain('is not a valid form token');
  });

  it('does not call out to the network for values that are not short links', async () => {
    await resolveFormToken('279015847');

    expect(mockAxiosHead).not.toHaveBeenCalled();
  });
});
