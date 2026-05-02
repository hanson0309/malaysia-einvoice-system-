import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const extractTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  req.tenantId = req.user.tenant_id;
  next();
};
