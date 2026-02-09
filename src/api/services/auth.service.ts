import { verifyPassword } from '../utils/password.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt.utils';
import {
  createUser,
  findUserByEmail,
  findUserById,
  User
} from './user.service';

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

/**
 * Remove password_hash from user object
 */
export function sanitizeUser(user: User): Omit<User, 'password_hash'> {
  const { password_hash, ...sanitizedUser } = user;
  return sanitizedUser;
}

/**
 * Sign up a new user
 * @throws Error if email already exists or validation fails
 */
export async function signup(
  email: string,
  password: string,
  weddingDate?: Date
): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error('Email already exists');
    (error as any).statusCode = 409;
    throw error;
  }

  // Create new user
  const user = await createUser(email, password, weddingDate);

  // Generate tokens
  const accessToken = generateAccessToken(user.user_id);
  const refreshToken = generateRefreshToken(user.user_id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  };
}

/**
 * Log in an existing user
 * @throws Error if credentials are invalid
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password');
    (error as any).statusCode = 401;
    throw error;
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    const error = new Error('Invalid email or password');
    (error as any).statusCode = 401;
    throw error;
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.user_id);
  const refreshToken = generateRefreshToken(user.user_id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  };
}

/**
 * Refresh access token using refresh token
 * @throws Error if refresh token is invalid or user not found
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<RefreshResponse> {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user
    const user = await findUserById(payload.userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.user_id);

    return {
      accessToken
    };
  } catch (error) {
    // Convert JWT errors to 401 errors
    if (error instanceof Error) {
      if (
        error.message === 'Invalid token type' ||
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        const authError = new Error('Invalid or expired refresh token');
        (authError as any).statusCode = 401;
        throw authError;
      }
    }
    // Re-throw other errors (like User not found)
    throw error;
  }
}
