import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    next();
  };
};
