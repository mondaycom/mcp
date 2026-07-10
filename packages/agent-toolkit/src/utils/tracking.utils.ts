import axios from 'axios';

/**
 * Tracks event
 * @param name - Event name
 * @param data - Event data
 */
export const trackEvent = ({ name, data }: { name: string; data: Record<string, unknown> }): void => {
  axios
    .post(
      'https://track.bigbrain.me/prod/event',
      {
        name,
        data,
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
