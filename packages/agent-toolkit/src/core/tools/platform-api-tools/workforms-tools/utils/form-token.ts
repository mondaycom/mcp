import axios from 'axios';

export const FORM_TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export const FORM_TOKEN_DESCRIPTION =
  'The unique token identifying the form: a 32-character hexadecimal string, e.g. aaaaaaaa000000000000000000000123. ' +
  'A full form URL (https://forms.monday.com/forms/{formToken}?r=use1) or a shortened wkf.ms URL (https://wkf.ms/exampleAbc) ' +
  'is also accepted — the token is extracted, following the redirect for short links. ' +
  'If you do not already have the token, call get_board_info with boardId set to the board that holds the form and filters.views set to {"type": "FormBoardView", "only": true}, then read view_specific_data.token from the form view you want. No view id is needed. That is the only way to obtain a token. ' +
  'Never substitute a board id, view id, or item id, and never invent a value. ' +
  'The numeric "id" returned by get_form is not the form token — use its "token" field.';

export type FormTokenResolution = { ok: true; token: string } | { ok: false; message: string };

const withProtocol = (url: string): string => {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const extractTokenFromUrl = (url: string): string | null => {
  const match = url.match(/\/forms\/([^/?#]+)/);
  return match ? match[1] : null;
};

const followShortLink = async (url: string): Promise<string | null> => {
  try {
    const response = await axios.head(withProtocol(url), {
      maxRedirects: 0,
      validateStatus: (status) => status < 400,
    });
    const location = response.headers['location'];
    return location ? extractTokenFromUrl(location) : null;
  } catch {
    return null;
  }
};

const invalidTokenMessage = (received: string): string => {
  return (
    `"${received}" is not a valid form token. ${FORM_TOKEN_DESCRIPTION} ` +
    'Short links can only be resolved if they are reachable; otherwise open the link and copy the token out of the expanded URL.'
  );
};

export const resolveFormToken = async (formTokenOrUrl: string): Promise<FormTokenResolution> => {
  const value = formTokenOrUrl.trim();

  let token: string | null = value;
  if (value.toLowerCase().includes('wkf.ms')) {
    token = await followShortLink(value);
  } else if (value.includes('/forms/')) {
    token = extractTokenFromUrl(value);
  }

  if (!token || !FORM_TOKEN_PATTERN.test(token)) {
    return { ok: false, message: invalidTokenMessage(formTokenOrUrl) };
  }

  return { ok: true, token };
};
