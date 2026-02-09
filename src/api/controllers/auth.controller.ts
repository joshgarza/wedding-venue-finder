import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema
} from '../schemas/auth.schema';
import { ZodError } from 'zod';

/**
 * Handle signup request
 */
export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = signupSchema.parse(req.body);

    // Create user and generate tokens
    const result = await authService.signup(
      validatedData.email,
      validatedData.password,
      validatedData.weddingDate
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors
        }
      });
      return;
    }

    next(error);
  }
}

/**
 * Handle login request
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Authenticate user and generate tokens
    const result = await authService.login(
      validatedData.email,
      validatedData.password
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors
        }
      });
      return;
    }

    next(error);
  }
}

/**
 * Handle refresh token request
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = refreshTokenSchema.parse(req.body);

    // Generate new access token
    const result = await authService.refreshAccessToken(
      validatedData.refreshToken
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.errors
        }
      });
      return;
    }

    next(error);
  }
}
