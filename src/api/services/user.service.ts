import { db } from '../../../db/db-config';
import { hashPassword } from '../utils/password.utils';

export interface User {
  user_id: string;
  email: string;
  password_hash: string;
  wedding_date: Date | null;
  created_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  weddingDate?: Date;
}

export interface UpdateUserData {
  wedding_date?: Date | null;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create a new user
 * @throws Error if email is invalid or password is too short
 */
export async function createUser(
  email: string,
  password: string,
  weddingDate?: Date
): Promise<User> {
  // Validate email format
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Validate password length
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase();

  // Insert user into database
  const [user] = await db('users')
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      wedding_date: weddingDate || null
    })
    .returning('*');

  return user;
}

/**
 * Find a user by email (case-insensitive)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();

  const user = await db('users')
    .where({ email: normalizedEmail })
    .first();

  return user || null;
}

/**
 * Find a user by ID
 */
export async function findUserById(userId: string): Promise<User | null> {
  const user = await db('users').where({ user_id: userId }).first();

  return user || null;
}

/**
 * Update user data
 * Note: Email and password_hash cannot be updated through this method
 * @throws Error if trying to update restricted fields
 */
export async function updateUser(
  userId: string,
  data: UpdateUserData
): Promise<User> {
  // Prevent updating restricted fields
  const restrictedFields = ['email', 'password_hash', 'user_id', 'created_at'];
  const dataKeys = Object.keys(data);

  for (const key of dataKeys) {
    if (restrictedFields.includes(key)) {
      throw new Error(`Cannot update field: ${key}`);
    }
  }

  const [updatedUser] = await db('users')
    .where({ user_id: userId })
    .update(data)
    .returning('*');

  return updatedUser;
}
