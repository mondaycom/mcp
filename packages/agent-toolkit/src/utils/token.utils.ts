import jwt from 'jsonwebtoken';

/**
 * JWT token payload structure from Monday.com API
 */
export interface MondayTokenPayload {
  tid: number; // team/account ID
  aai: number; // API app ID
  uid: number; // user ID
  iad: string; // issued at date
  per: string; // permissions
  actid: number; // account ID
  rgn: string; // region
}

/**
 * Decodes a JWT token to extract the payload
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if invalid
 */
export const decodeJwtToken = (token: string): MondayTokenPayload | null => {
  try {
    // Use jsonwebtoken library to decode (without verification)
    const decoded = jwt.decode(token) as MondayTokenPayload | null;
    return decoded;
  } catch (error) {
    // If decoding fails, return null
    return null;
  }
};

/**
 * Extracts token information for tracking
 * @param token - The Monday.com API token
 * @returns Token information object or empty object if extraction fails
 */
export const extractTokenInfo = (token: string): Partial<MondayTokenPayload> => {
  const tokenPayload = decodeJwtToken(token);
  if (!tokenPayload) {
    return {};
  }

  return {
    tid: tokenPayload.tid,
    aai: tokenPayload.aai,
    uid: tokenPayload.uid,
    actid: tokenPayload.actid,
    rgn: tokenPayload.rgn,
    per: tokenPayload.per,
  };
};
