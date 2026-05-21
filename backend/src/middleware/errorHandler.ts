import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('=== ERROR HANDLER ===');
  console.error('Error type:', err.constructor.name);
  console.error('Error message:', err.message);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  console.error('Request body:', JSON.stringify(req.body, null, 2));
  console.error('Stack trace:', err.stack);

  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    console.error('Mongoose validation error:', err);
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose cast errors
  if (err.name === 'CastError') {
    console.error('Mongoose cast error:', err);
    return res.status(400).json({
      error: 'Invalid data format',
      code: 'CAST_ERROR',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Unexpected errors
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
};
