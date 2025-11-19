import jwt from 'jsonwebtoken';

/**
 * JWT token payload structure from monday.com API
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
 * Normalizes a token by removing common prefixes and whitespace
 * @param token - The token to normalize (may include "Bearer " prefix)
 * @returns The clean token string
 */
export const normalizeToken = (token: string): string => {
  const trimmed = token.trim();

  // Check if token starts with Bearer scheme
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    // Split by space and return the token part (everything after "Bearer ")
    return trimmed.split(/\s+/)[1] || trimmed;
  }

  return trimmed;
};

/**
 * Decodes a JWT token to extract the payload
 * @param token - The JWT token to decode (should be a clean token without "Bearer " prefix)
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
 * @param token - The monday.com API token (may include "Bearer " prefix)
 * @returns Token information object or empty object if extraction fails
 */
export const extractTokenInfo = (token: string): Partial<MondayTokenPayload> => {
  const normalizedToken = normalizeToken(token);
  const tokenPayload = decodeJwtToken(normalizedToken);
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
