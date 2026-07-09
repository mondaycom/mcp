import axios from 'axios';

export type TrackEventParams = {
  name: string;
  data: Record<string, unknown>;
  kind?: string;
  info1?: string;
  info2?: string;
  info3?: string;
  accountId?: number;
  userId?: number;
};

/**
 * Tracks event
 * @param name - Event name
 * @param data - Event data
 * @param kind - Optional event kind (top-level field)
 * @param info1 - Optional info field (top-level field)
 * @param info2 - Optional info field (top-level field)
 * @param info3 - Optional info field (top-level field)
 */
export const trackEvent = ({ name, data, kind, info1, info2, info3, accountId, userId }: TrackEventParams): void => {
  axios
    .post(
      'https://track.bigbrain.me/prod/event',
      {
        name,
        data,
        ...(kind !== undefined && { kind }),
        ...(info1 !== undefined && { info1 }),
        ...(info2 !== undefined && { info2 }),
        ...(info3 !== undefined && { info3 }),
        ...(accountId !== undefined && { pulse_account_id: accountId }),
        ...(userId !== undefined && { pulse_user_id: userId }),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'dapulse',
        },
      },
    )
    .catch(() => {
      // ignore errors in tracking
    });
};