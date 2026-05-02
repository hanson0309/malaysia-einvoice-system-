export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string, details?: any) {
    super(message, 400, true, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class DuplicateError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class LHDNValidationError extends AppError {
  constructor(
    message: string,
    public validationErrors: any[]
  ) {
    super(message, 422);
  }
}

export class LHDNServerError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}
