import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Generate an access token for a user
 * @param userId - User ID to encode in token
 * @returns JWT access token
 * @throws Error if JWT_SECRET is not set
 */
export function generateAccessToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign({ userId, type: 'access' }, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

/**
 * Generate a refresh token for a user
 * @param userId - User ID to encode in token
 * @returns JWT refresh token
 * @throws Error if JWT_SECRET is not set
 */
export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign({ userId, type: 'refresh' }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

/**
 * Verify and decode an access token
 * @param token - JWT access token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or not an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid token type') {
      throw error;
    }
    // Re-throw jwt verification errors (expired, invalid signature, etc.)
    throw error;
  }
}

/**
 * Verify and decode a refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or not a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid token type') {
      throw error;
    }
    // Re-throw jwt verification errors
    throw error;
  }
}
